import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("NEW_RESEND_API_KEY") || Deno.env.get("RESEND_API_KEY") || Deno.env.get("RESEND_API_KEY_1");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface PendingRequest {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  created_at: string;
  property_id: string;
  organization_id: string;
  last_reminder_sent_at: string | null;
}

interface PropertyData {
  id: string;
  name: string;
  address: string;
  email: string;
  practice_leader_email: string | null;
}

interface ManagerProfile {
  id: string;
  name: string;
  email: string;
  assigned_properties: string[];
  notification_settings: {
    emailNotifications?: boolean;
  } | null;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'critical': return '#dc2626';
    case 'high': return '#ea580c';
    case 'medium': return '#d97706';
    default: return '#6b7280';
  }
};

const generateEmailHtml = (
  request: PendingRequest,
  property: PropertyData,
  daysOld: number,
  organizationName: string
): string => {
  const priorityColor = getPriorityColor(request.priority);
  const appUrl = "https://housinghub.app";
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Pending Request Reminder</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">${organizationName}</p>
      </div>
      
      <div style="background: #fffbeb; padding: 20px; border-left: 4px solid #f59e0b;">
        <p style="margin: 0; color: #92400e; font-weight: 600;">
          This maintenance request has been pending for ${daysOld} days and requires attention.
        </p>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px;">${request.title}</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; width: 120px;">Property:</td>
            <td style="padding: 8px 0; font-weight: 500;">${property.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Address:</td>
            <td style="padding: 8px 0;">${property.address}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Priority:</td>
            <td style="padding: 8px 0;">
              <span style="background: ${priorityColor}20; color: ${priorityColor}; padding: 4px 12px; border-radius: 4px; font-weight: 500; text-transform: capitalize;">
                ${request.priority}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Days Pending:</td>
            <td style="padding: 8px 0;">
              <span style="background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 4px; font-weight: 600;">
                ${daysOld} days
              </span>
            </td>
          </tr>
        </table>
        
        ${request.description ? `
          <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; color: #4b5563; font-size: 14px;">${request.description.substring(0, 300)}${request.description.length > 300 ? '...' : ''}</p>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${appUrl}/requests/${request.id}" 
             style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Take Action Now
          </a>
        </div>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background: #f9fafb;">
        <p style="margin: 0;">This is an automated reminder from ${organizationName}</p>
        <p style="margin: 5px 0 0 0;">
          <a href="${appUrl}" style="color: #f59e0b;">HousingHub</a>
        </p>
      </div>
    </body>
    </html>
  `;
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("🔔 Starting pending request reminders job...");

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(RESEND_API_KEY);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Calculate the cutoff date (3 days ago)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    // Calculate 7 days ago for reminder throttling
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch pending/open requests older than 3 days that haven't been reminded in 7 days
    const { data: pendingRequests, error: requestsError } = await supabase
      .from("maintenance_requests")
      .select(`
        id,
        title,
        description,
        priority,
        status,
        created_at,
        property_id,
        organization_id,
        last_reminder_sent_at
      `)
      .in("status", ["pending", "open"])
      .lt("created_at", threeDaysAgo.toISOString())
      .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${sevenDaysAgo.toISOString()}`);

    if (requestsError) {
      console.error("❌ Error fetching pending requests:", requestsError);
      throw requestsError;
    }

    console.log(`📋 Found ${pendingRequests?.length || 0} requests needing reminders`);

    if (!pendingRequests || pendingRequests.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No pending requests need reminders", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let emailsSent = 0;
    let notificationsCreated = 0;
    const errors: string[] = [];

    for (const request of pendingRequests) {
      try {
        console.log(`📝 Processing request: ${request.id} - ${request.title}`);

        // Calculate days old
        const daysOld = Math.floor(
          (Date.now() - new Date(request.created_at).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Fetch property details
        const { data: property, error: propertyError } = await supabase
          .from("properties")
          .select("id, name, address, email, practice_leader_email")
          .eq("id", request.property_id)
          .single();

        if (propertyError || !property) {
          console.error(`❌ Error fetching property for request ${request.id}:`, propertyError);
          errors.push(`Property fetch failed for ${request.id}`);
          continue;
        }

        // Fetch organization name
        const { data: org } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", request.organization_id)
          .single();

        const organizationName = org?.name || "HousingHub";

        // Collect email recipients (deduplicated)
        const emailRecipients = new Set<string>();
        
        // Add property contact email
        if (property.email) {
          emailRecipients.add(property.email.toLowerCase());
        }
        
        // Add practice leader email
        if (property.practice_leader_email) {
          emailRecipients.add(property.practice_leader_email.toLowerCase());
        }

        // Fetch managers assigned to this property
        const { data: managers } = await supabase
          .from("profiles")
          .select("id, name, email, assigned_properties, notification_settings")
          .eq("organization_id", request.organization_id)
          .eq("role", "manager");

        const assignedManagers = (managers || []).filter((m: ManagerProfile) => 
          m.assigned_properties?.includes(request.property_id)
        );

        // Add manager emails (respecting preferences)
        for (const manager of assignedManagers) {
          const emailEnabled = manager.notification_settings?.emailNotifications !== false;
          if (emailEnabled && manager.email) {
            emailRecipients.add(manager.email.toLowerCase());
          }
        }

        // Generate email HTML
        const emailHtml = generateEmailHtml(request, property, daysOld, organizationName);
        const subject = `⏰ Reminder: Maintenance Request Pending ${daysOld} Days - ${request.title}`;

        // Send emails with rate limiting
        for (const recipientEmail of emailRecipients) {
          try {
            const emailResponse = await resend.emails.send({
              from: `${organizationName} <onboarding@housinghub.app>`,
              to: [recipientEmail],
              subject,
              html: emailHtml,
            });

            if (emailResponse.error) {
              console.error(`❌ Failed to send to ${recipientEmail}:`, emailResponse.error);
            } else {
              console.log(`✅ Reminder sent to ${recipientEmail}`);
              emailsSent++;
            }

            // Rate limit: 600ms delay
            await delay(600);
          } catch (emailError) {
            console.error(`❌ Email error for ${recipientEmail}:`, emailError);
          }
        }

        // Create in-app notifications for managers
        for (const manager of assignedManagers) {
          const appNotificationsEnabled = manager.notification_settings?.appNotifications !== false;
          if (appNotificationsEnabled) {
            const { error: notifError } = await supabase
              .from("notifications")
              .insert({
                user_id: manager.id,
                organization_id: request.organization_id,
                title: "Pending Request Reminder",
                message: `"${request.title}" has been pending for ${daysOld} days at ${property.name}`,
                type: "reminder",
                link: `/requests/${request.id}`,
              });

            if (!notifError) {
              notificationsCreated++;
            }
          }
        }

        // Update last_reminder_sent_at
        const { error: updateError } = await supabase
          .from("maintenance_requests")
          .update({ last_reminder_sent_at: new Date().toISOString() })
          .eq("id", request.id);

        if (updateError) {
          console.error(`❌ Error updating reminder timestamp for ${request.id}:`, updateError);
        }

      } catch (requestError) {
        console.error(`❌ Error processing request ${request.id}:`, requestError);
        errors.push(`Processing failed for ${request.id}`);
      }
    }

    console.log(`✅ Pending request reminders complete: ${emailsSent} emails sent, ${notificationsCreated} notifications created`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Pending request reminders processed",
        emailsSent,
        notificationsCreated,
        requestsProcessed: pendingRequests.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Fatal error in pending request reminders:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
