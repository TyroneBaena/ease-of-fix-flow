import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LandlordReportRequest {
  request_id: string;
  landlord_email?: string;
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
    const resendApiKey = Deno.env.get("NEW_RESEND_API_KEY") || 
                         Deno.env.get("RESEND_API_KEY") || 
                         Deno.env.get("RESEND_API_KEY_1");
    const resend = new Resend(resendApiKey);
    
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

    // Fetch organization data
    let organizationName = "Property Management";
    if (request.organization_id) {
      const { data: organization } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", request.organization_id)
        .single();
      
      if (organization?.name) {
        organizationName = organization.name;
      }
    }
    console.log("Organization name:", organizationName);

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
      
      if (landlordData?.email) {
        landlordEmail = landlordData.email;
        console.log("Found landlord email:", landlordEmail);
      }
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

    const propertyAddress = request.properties?.address || request.properties?.name || "Property";

    // Generate email HTML content with organization branding
    let emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
        <!-- Organization Header -->
        <div style="background-color: #1e3a5f; color: white; padding: 25px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: bold;">${organizationName}</h1>
          <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Maintenance Report</p>
        </div>
        
        <!-- Property Address Banner -->
        <div style="background-color: #374151; color: white; padding: 15px 25px;">
          <p style="margin: 0; font-size: 16px;">
            <strong>Property:</strong> ${propertyAddress}
          </p>
        </div>
        
        <div style="padding: 20px;">
    `;

    // Request Summary
    if (options.summary) {
      emailContent += `
        <div style="margin: 20px 0; padding: 20px; border: 2px solid #dee2e6; border-radius: 8px; background-color: #f8f9fa;">
          <h2 style="color: #495057; margin-top: 0; background-color: #e9ecef; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 5px solid #6c757d;">📋 Request Summary</h2>
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
        <div style="margin: 20px 0; padding: 20px; border: 2px solid #ffc107; border-radius: 8px; background-color: #fff8e1;">
          <h2 style="color: #f57c00; margin-top: 0; background-color: #ffecb3; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 5px solid #ff9800;">🏢 Property Details</h2>
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
        <div style="margin: 20px 0; padding: 20px; border: 2px solid #9c27b0; border-radius: 8px; background-color: #f3e5f5;">
          <h2 style="color: #7b1fa2; margin-top: 0; background-color: #e1bee7; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 5px solid #9c27b0;">⚠️ Issue Details</h2>
          <div style="font-size: 14px;">
            ${request.issue_nature ? `<div style="margin-bottom: 12px; padding: 8px;"><strong>Issue Nature:</strong> ${request.issue_nature}</div>` : ''}
            ${request.description ? `<div style="margin-bottom: 12px; padding: 8px;"><strong>Description:</strong> ${request.description}</div>` : ''}
            ${request.explanation ? `<div style="margin-bottom: 12px; padding: 8px;"><strong>Explanation:</strong> ${request.explanation}</div>` : ''}
            ${request.attempted_fix ? `<div style="margin-bottom: 12px; padding: 8px;"><strong>Attempted Fix:</strong> ${request.attempted_fix}</div>` : ''}
          </div>
        </div>
      `;
    }

    // Photos - embed actual images
    if (options.photos && request.attachments) {
      const attachments = Array.isArray(request.attachments) ? request.attachments : [];
      if (attachments.length > 0) {
        emailContent += `
          <div style="margin: 20px 0; padding: 20px; border: 2px solid #4caf50; border-radius: 8px; background-color: #e8f5e9;">
            <h2 style="color: #388e3c; margin-top: 0; background-color: #c8e6c9; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 5px solid #4caf50;">📸 Photos (${attachments.length})</h2>
            <div style="display: flex; flex-wrap: wrap; gap: 15px;">
              ${attachments.map((att: any, idx: number) => `
                <div style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; max-width: 350px;">
                  <img 
                    src="${att.url}" 
                    alt="Maintenance photo ${idx + 1}" 
                    style="width: 100%; height: auto; max-height: 300px; object-fit: cover; display: block;"
                  />
                  ${att.name ? `<p style="margin: 8px; font-size: 12px; color: #666;">${att.name}</p>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    }

    // Footer with organization branding
    emailContent += `
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f3f4f6; padding: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
          <p style="margin: 0 0 8px 0; color: #4b5563; font-size: 14px;">
            <strong>Sent by ${organizationName}</strong>
          </p>
          <p style="margin: 0; color: #6b7280; font-size: 12px;">
            Regarding property: ${propertyAddress}
          </p>
          <p style="margin: 12px 0 0 0; color: #9ca3af; font-size: 11px;">
            If you have questions, please contact your property manager.
          </p>
        </div>
      </div>
    `;

    // Send email to landlord with updated subject
    const emailResponse = await resend.emails.send({
      from: "HousingHub <notifications@housinghub.app>",
      to: [landlordEmail],
      subject: `[${organizationName}] Maintenance Report - ${propertyAddress}`,
      html: emailContent,
    });

    console.log("Resend API response:", JSON.stringify(emailResponse));

    // Verify email was actually sent by Resend
    if (emailResponse.error) {
      console.error("Resend returned error:", emailResponse.error);
      throw new Error(`Email service error: ${emailResponse.error.message || 'Unknown error'}`);
    }

    if (!emailResponse.data?.id) {
      console.error("Resend did not return email ID - possible silent failure");
      throw new Error('Email sending failed: No confirmation from email service');
    }

    console.log("Email sent successfully with ID:", emailResponse.data.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Report sent to landlord successfully",
        email: landlordEmail,
        emailId: emailResponse.data.id
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
