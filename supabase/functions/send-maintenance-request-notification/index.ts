import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestNotificationData {
  request_id: string;
  property_id: string;
  request_title: string;
  request_description: string;
  request_category: string;
  request_priority: string;
  request_location: string;
  submitter_name: string;
  property_name: string;
  property_address: string;
  property_email: string;
  practice_leader_email?: string;
  practice_leader_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('NEW_RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('NEW_RESEND_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const { request_id } = await req.json();
    
    if (!request_id) {
      throw new Error('request_id is required');
    }

    console.log('Fetching maintenance request and property details for:', request_id);

    // Fetch maintenance request with property details
    const { data: requestData, error: requestError } = await supabase
      .from('maintenance_requests')
      .select(`
        *,
        properties (
          name,
          address,
          email,
          practice_leader,
          practice_leader_email
        ),
        profiles (
          name
        )
      `)
      .eq('id', request_id)
      .single();

    if (requestError || !requestData) {
      console.error('Error fetching request data:', requestError);
      throw new Error('Failed to fetch maintenance request details');
    }

    const property = requestData.properties;
    const submitter = requestData.profiles;

    if (!property) {
      throw new Error('Property information not found');
    }

    console.log('Sending emails for request:', requestData.title);

    const emailSubject = `New Maintenance Request: ${requestData.title}`;
    const directLink = `${Deno.env.get('APPLICATION_URL') || 'https://your-app.com'}/requests/${request_id}`;

    const createEmailHtml = (recipientType: string) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          New Maintenance Request Submitted
        </h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #007bff; margin-top: 0;">Request Details</h3>
          <p><strong>Title:</strong> ${requestData.title}</p>
          <p><strong>Description:</strong> ${requestData.description}</p>
          <p><strong>Category:</strong> ${requestData.category}</p>
          <p><strong>Priority:</strong> ${requestData.priority}</p>
          <p><strong>Location:</strong> ${requestData.location}</p>
          <p><strong>Submitted by:</strong> ${submitter?.name || 'Unknown'}</p>
          <p><strong>Date:</strong> ${new Date(requestData.created_at).toLocaleDateString()}</p>
        </div>

        <div style="background-color: #e9ecef; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #007bff; margin-top: 0;">Property Information</h3>
          <p><strong>Property:</strong> ${property.name}</p>
          <p><strong>Address:</strong> ${property.address}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${directLink}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Request Details
          </a>
        </div>

        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          You are receiving this email as the ${recipientType} for this property. 
          Please log in to the system to review and manage this maintenance request.
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          This is an automated notification from the Property Management System.
        </p>
      </div>
    `;

    const emailPromises = [];

    // Send to property contact email
    if (property.email) {
      console.log('Sending email to property contact:', property.email);
      emailPromises.push(
        resend.emails.send({
          from: 'Property Manager <onboarding@resend.dev>',
          to: [property.email],
          subject: emailSubject,
          html: createEmailHtml('property contact'),
        })
      );
    }

    // Send to practice leader if provided
    if (property.practice_leader_email) {
      console.log('Sending email to practice leader:', property.practice_leader_email);
      emailPromises.push(
        resend.emails.send({
          from: 'Property Manager <onboarding@resend.dev>',
          to: [property.practice_leader_email],
          subject: emailSubject,
          html: createEmailHtml('practice leader'),
        })
      );
    }

    if (emailPromises.length === 0) {
      console.log('No email addresses configured for notifications');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No email addresses configured for notifications' 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Send all emails concurrently
    const emailResults = await Promise.allSettled(emailPromises);
    
    const successful = emailResults.filter(result => result.status === 'fulfilled').length;
    const failed = emailResults.filter(result => result.status === 'rejected').length;

    console.log(`Email sending complete. Successful: ${successful}, Failed: ${failed}`);

    // Log any failures
    emailResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Email ${index + 1} failed:`, result.reason);
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        emails_sent: successful,
        emails_failed: failed,
        message: `Successfully sent ${successful} notification email(s)` 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error) {
    console.error('Error in send-maintenance-request-notification:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send notifications' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);