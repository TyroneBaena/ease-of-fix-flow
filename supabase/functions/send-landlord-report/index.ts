import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LandlordReportRequest {
  request_id: string;
  options: {
    summary: boolean;
    property: boolean;
    issue: boolean;
    photos: boolean;
    practiceLeader?: boolean;
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Landlord report email function called");
  console.log("Request method:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY_1"));
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { request_id, options }: LandlordReportRequest = await req.json();
    
    console.log("Processing landlord report for request:", request_id);
    console.log("Report options:", options);

    // Get maintenance request details
    const { data: request, error: requestError } = await supabase
      .from("maintenance_requests")
      .select(`
        *,
        properties!inner (
          id,
          name,
          address,
          practice_leader,
          practice_leader_email,
          practice_leader_phone,
          landlords (
            id,
            name,
            email,
            phone
          )
        )
      `)
      .eq("id", request_id)
      .single();

    if (requestError || !request) {
      console.error("Request not found:", requestError);
      return new Response(
        JSON.stringify({ error: "Request not found" }),
        { 
          status: 404, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    // Check if landlord email exists
    const landlordEmail = request.properties.landlords?.email;
    if (!landlordEmail) {
      console.error("No landlord email found for property");
      return new Response(
        JSON.stringify({ error: "No landlord email found for this property" }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    console.log("Sending report to landlord:", landlordEmail);

    // Generate email HTML content based on selected options
    let emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">
          Maintenance Request Report
        </h1>
    `;

    // Request Summary
    if (options.summary) {
      emailContent += `
        <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #555; margin-top: 0;">Request Summary</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div><strong>Request ID:</strong> ${request.id}</div>
            <div><strong>Created:</strong> ${new Date(request.created_at).toLocaleDateString()}</div>
            <div><strong>Title:</strong> ${request.title || 'N/A'}</div>
            <div><strong>Status:</strong> ${request.status || 'N/A'}</div>
            <div><strong>Priority:</strong> ${request.priority || 'N/A'}</div>
            <div><strong>Location:</strong> ${request.location || 'N/A'}</div>
            ${request.report_date ? `<div><strong>Report Date:</strong> ${request.report_date}</div>` : ''}
            ${request.site ? `<div><strong>Site:</strong> ${request.site}</div>` : ''}
            ${request.submitted_by ? `<div><strong>Submitted By:</strong> ${request.submitted_by}</div>` : ''}
          </div>
        </div>
      `;
    }

    // Property Details
    if (options.property) {
      emailContent += `
        <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #555; margin-top: 0;">Property Details</h2>
          <div><strong>Name:</strong> ${request.properties.name || 'N/A'}</div>
          <div><strong>Address:</strong> ${request.properties.address || 'N/A'}</div>
          ${options.practiceLeader && request.properties.practice_leader ? `
            <div><strong>Practice Leader:</strong> ${request.properties.practice_leader}</div>
            ${request.properties.practice_leader_email ? `<div><strong>Email:</strong> ${request.properties.practice_leader_email}</div>` : ''}
            ${request.properties.practice_leader_phone ? `<div><strong>Phone:</strong> ${request.properties.practice_leader_phone}</div>` : ''}
          ` : ''}
        </div>
      `;
    }

    // Issue Details
    if (options.issue) {
      emailContent += `
        <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #555; margin-top: 0;">Issue Details</h2>
          ${request.issue_nature ? `<div><strong>Issue Nature:</strong> ${request.issue_nature}</div>` : ''}
          ${request.description ? `<div style="margin: 10px 0;"><strong>Description:</strong> ${request.description}</div>` : ''}
          ${request.explanation ? `<div style="margin: 10px 0;"><strong>Explanation:</strong> ${request.explanation}</div>` : ''}
          ${request.attempted_fix ? `<div style="margin: 10px 0;"><strong>Attempted Fix:</strong> ${request.attempted_fix}</div>` : ''}
        </div>
      `;
    }

    // Photos
    if (options.photos && request.attachments) {
      const attachments = Array.isArray(request.attachments) ? request.attachments : [];
      if (attachments.length > 0) {
        emailContent += `
          <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: #555; margin-top: 0;">Photos (${attachments.length})</h2>
            <p style="margin: 10px 0;">Photos are attached to this maintenance request. Please review them for additional context.</p>
          </div>
        `;
      }
    }

    emailContent += `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee; color: #666; font-size: 12px;">
          <p>This report was automatically generated from the Housing Maintenance System.</p>
          <p>If you have any questions, please contact the property management team.</p>
        </div>
      </div>
    `;

    // Send email to landlord
    const emailResponse = await resend.emails.send({
      from: "Housing System <notifications@housinghub.app>",
      to: [landlordEmail],
      subject: `Maintenance Request Report - ${request.properties.name}`,
      html: emailContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Report sent to landlord successfully",
        email: landlordEmail 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in send-landlord-report function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);