import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LandlordReportRequest {
  request_id: string;
  landlord_email?: string; // Add the email from dialog
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
    const resend = new Resend(Deno.env.get("NEW_RESEND_API_KEY"));
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { request_id, landlord_email: providedEmail, options }: LandlordReportRequest = await req.json();
    
    console.log("Processing landlord report for request:", request_id);
    console.log("Report options:", options);

    if (!request_id) {
      console.error("No request_id provided");
      return new Response(
        JSON.stringify({ error: "Request ID is required" }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    // Get maintenance request details
    const { data: request, error: requestError } = await supabase
      .from("maintenance_requests")
      .select(`
        *,
        properties (
          id,
          name,
          address,
          practice_leader,
          practice_leader_email,
          practice_leader_phone,
          landlord_id
        )
      `)
      .eq("id", request_id)
      .single();

    if (requestError) {
      console.error("Request error:", requestError);
      return new Response(
        JSON.stringify({ error: "Database error: " + requestError.message }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    if (!request) {
      console.error("Request not found");
      return new Response(
        JSON.stringify({ error: "Request not found" }),
        { 
          status: 404, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    // Get landlord info separately if landlord_id exists
    let landlordData = null;
    if (request.properties?.landlord_id) {
      const { data: landlord } = await supabase
        .from("landlords")
        .select("id, name, email, phone")
        .eq("id", request.properties.landlord_id)
        .single();
      landlordData = landlord;
    }

    console.log("Request data:", JSON.stringify(request, null, 2));
    console.log("Property data:", JSON.stringify(request.properties, null, 2));

    // Use provided email first, then fallback to database lookup
    let landlordEmail = providedEmail?.trim();
    
    if (!landlordEmail) {
      console.log("No email provided, looking for landlord email in database...");
      console.log("Landlord data:", landlordData);
      console.log("Practice leader email:", request.properties?.practice_leader_email);
      
      // First try the landlord relationship
      if (landlordData?.email) {
        landlordEmail = landlordData.email;
        console.log("Found landlord email:", landlordEmail);
      }
      // Fallback to practice leader email
      else if (request.properties?.practice_leader_email) {
        landlordEmail = request.properties.practice_leader_email;
        console.log("Using practice leader email:", landlordEmail);
      }
    } else {
      console.log("Using provided email:", landlordEmail);
    }
    
    if (!landlordEmail) {
      console.error("No landlord email found for property");
      return new Response(
        JSON.stringify({ 
          error: "No landlord email found for this property. Please provide an email address or add a landlord/practice leader email to the property." 
        }),
        { 
          status: 400, 
          headers: { "Content-Type": "application/json", ...corsHeaders } 
        }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(landlordEmail)) {
      console.error("Invalid email format:", landlordEmail);
      return new Response(
        JSON.stringify({ error: "Invalid email address format" }),
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

    // Report Configuration Section
    emailContent += `
      <div style="margin: 20px 0; padding: 20px; border: 2px solid #2196f3; border-radius: 8px; background-color: #e3f2fd !important;">
        <h2 style="color: #1976d2; margin-top: 0; background-color: #bbdefb !important; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 5px solid #2196f3;">⚙️ Report Configuration</h2>
        <div style="font-size: 14px;">
          <div style="margin-bottom: 8px; padding: 4px;">
            <span style="display: inline-block; width: 20px;">${options.summary ? '✅' : '❌'}</span>
            <strong>Request Summary:</strong> ${options.summary ? 'Included' : 'Not included'}
          </div>
          <div style="margin-bottom: 8px; padding: 4px;">
            <span style="display: inline-block; width: 20px;">${options.property ? '✅' : '❌'}</span>
            <strong>Property Details:</strong> ${options.property ? 'Included' : 'Not included'}
          </div>
          <div style="margin-bottom: 8px; padding: 4px;">
            <span style="display: inline-block; width: 20px;">${options.issue ? '✅' : '❌'}</span>
            <strong>Issue Details:</strong> ${options.issue ? 'Included' : 'Not included'}
          </div>
          <div style="margin-bottom: 8px; padding: 4px;">
            <span style="display: inline-block; width: 20px;">${options.photos ? '✅' : '❌'}</span>
            <strong>Photos:</strong> ${options.photos ? 'Included' : 'Not included'}
          </div>
          ${options.practiceLeader !== undefined ? `
            <div style="margin-bottom: 8px; padding: 4px;">
              <span style="display: inline-block; width: 20px;">${options.practiceLeader ? '✅' : '❌'}</span>
              <strong>Practice Leader Details:</strong> ${options.practiceLeader ? 'Included' : 'Not included'}
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // Request Summary
    if (options.summary) {
      emailContent += `
        <div style="margin: 20px 0; padding: 20px; border: 2px solid #dee2e6; border-radius: 8px; background-color: #f8f9fa !important;">
          <h2 style="color: #495057; margin-top: 0; background-color: #e9ecef !important; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 5px solid #6c757d;">📋 Request Summary</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 14px;">
            <div style="padding: 8px;"><strong>Request ID:</strong> ${request.id}</div>
            <div style="padding: 8px;"><strong>Created:</strong> ${new Date(request.created_at).toLocaleDateString()}</div>
            <div style="padding: 8px;"><strong>Title:</strong> ${request.title || 'N/A'}</div>
            <div style="padding: 8px;"><strong>Status:</strong> ${request.status || 'N/A'}</div>
            <div style="padding: 8px;"><strong>Priority:</strong> ${request.priority || 'N/A'}</div>
            <div style="padding: 8px;"><strong>Location:</strong> ${request.location || 'N/A'}</div>
            ${request.report_date ? `<div style="padding: 8px;"><strong>Report Date:</strong> ${request.report_date}</div>` : ''}
            ${request.site ? `<div style="padding: 8px;"><strong>Site:</strong> ${request.site}</div>` : ''}
            ${request.submitted_by ? `<div style="padding: 8px;"><strong>Submitted By:</strong> ${request.submitted_by}</div>` : ''}
          </div>
        </div>
      `;
    }

    // Property Details
    if (options.property) {
      emailContent += `
        <div style="margin: 20px 0; padding: 20px; border: 2px solid #ffc107; border-radius: 8px; background-color: #fff8e1 !important;">
          <h2 style="color: #f57c00; margin-top: 0; background-color: #ffecb3 !important; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 5px solid #ff9800;">🏢 Property Details</h2>
          <div style="font-size: 14px;">
            <div style="margin-bottom: 12px; padding: 8px;"><strong>Name:</strong> ${request.properties.name || 'N/A'}</div>
            <div style="margin-bottom: 12px; padding: 8px;"><strong>Address:</strong> ${request.properties.address || 'N/A'}</div>
            ${options.practiceLeader && request.properties.practice_leader ? `
              <div style="margin-bottom: 12px; padding: 8px;"><strong>Practice Leader:</strong> ${request.properties.practice_leader}</div>
              ${request.properties.practice_leader_email ? `<div style="margin-bottom: 12px; padding: 8px;"><strong>Email:</strong> ${request.properties.practice_leader_email}</div>` : ''}
              ${request.properties.practice_leader_phone ? `<div style="margin-bottom: 12px; padding: 8px;"><strong>Phone:</strong> ${request.properties.practice_leader_phone}</div>` : ''}
            ` : ''}
          </div>
        </div>
      `;
    }

    // Issue Details
    if (options.issue) {
      emailContent += `
        <div style="margin: 20px 0; padding: 20px; border: 2px solid #9c27b0; border-radius: 8px; background-color: #f3e5f5 !important;">
          <h2 style="color: #7b1fa2; margin-top: 0; background-color: #e1bee7 !important; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 5px solid #9c27b0;">⚠️ Issue Details</h2>
          <div style="font-size: 14px;">
            ${request.issue_nature ? `<div style="margin-bottom: 12px; padding: 8px;"><strong>Issue Nature:</strong> ${request.issue_nature}</div>` : ''}
            ${request.description ? `<div style="margin-bottom: 12px; padding: 8px;"><strong>Description:</strong> ${request.description}</div>` : ''}
            ${request.explanation ? `<div style="margin-bottom: 12px; padding: 8px;"><strong>Explanation:</strong> ${request.explanation}</div>` : ''}
            ${request.attempted_fix ? `<div style="margin-bottom: 12px; padding: 8px;"><strong>Attempted Fix:</strong> ${request.attempted_fix}</div>` : ''}
          </div>
        </div>
      `;
    }

    // Photos
    if (options.photos && request.attachments) {
      const attachments = Array.isArray(request.attachments) ? request.attachments : [];
      if (attachments.length > 0) {
        emailContent += `
          <div style="margin: 20px 0; padding: 20px; border: 2px solid #4caf50; border-radius: 8px; background-color: #e8f5e8 !important;">
            <h2 style="color: #388e3c; margin-top: 0; background-color: #c8e6c9 !important; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 5px solid #4caf50;">📸 Photos (${attachments.length})</h2>
            <p style="margin: 10px 0; font-size: 14px; padding: 8px;">Photos are attached to this maintenance request. Please review them for additional context.</p>
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