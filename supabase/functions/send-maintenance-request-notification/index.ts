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

    // Fetch maintenance request with property and profile details separately
    const { data: requestData, error: requestError } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('id', request_id)
      .single();

    if (requestError || !requestData) {
      console.error('Error fetching request data:', requestError);
      throw new Error('Failed to fetch maintenance request details');
    }

    // Fetch property details
    const { data: propertyData, error: propertyError } = await supabase
      .from('properties')
      .select('name, address, email, practice_leader, practice_leader_email')
      .eq('id', requestData.property_id)
      .single();

    // Fetch submitter profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', requestData.user_id)
      .single();

    if (propertyError) {
      console.error('Error fetching property data:', propertyError);
    }

    if (profileError) {
      console.error('Error fetching profile data:', profileError);
    }

    if (!propertyData) {
      throw new Error('Property information not found');
    }

    console.log('Sending emails for request:', requestData.title);

    // Create in-app notifications for admins and managers
    console.log('Creating in-app notifications...');
    
    // Get admin and manager users
    const { data: adminUsers, error: adminError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin');

    const { data: managerUsers, error: managerError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'manager');

    if (adminError) console.error('Error fetching admin users:', adminError);
    if (managerError) console.error('Error fetching manager users:', managerError);

    // Create notifications for all admin and manager users
    const notificationUsers = [...(adminUsers || []), ...(managerUsers || [])];
    const notificationTitle = 'New Maintenance Request';
    const notificationMessage = `New request "${requestData.title}" submitted for ${propertyData.name}`;
    const notificationLink = `/requests/${request_id}`;

    for (const user of notificationUsers) {
      try {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            title: notificationTitle,
            message: notificationMessage,
            type: 'info',
            link: notificationLink
          });

        if (notificationError) {
          console.error('Error creating notification for user:', user.id, notificationError);
        } else {
          console.log('Created notification for user:', user.id);
        }
      } catch (error) {
        console.error('Error inserting notification:', error);
      }
    }

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
           <p><strong>Submitted by:</strong> ${profileData?.name || 'Unknown'}</p>
           <p><strong>Date:</strong> ${new Date(requestData.created_at).toLocaleDateString()}</p>
         </div>

         <div style="background-color: #e9ecef; padding: 20px; border-radius: 5px; margin: 20px 0;">
           <h3 style="color: #007bff; margin-top: 0;">Property Information</h3>
           <p><strong>Property:</strong> ${propertyData.name}</p>
           <p><strong>Address:</strong> ${propertyData.address}</p>
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
    if (propertyData.email) {
      console.log('Sending email to property contact:', propertyData.email);
      emailPromises.push(
        resend.emails.send({
          from: 'Property Manager <onboarding@resend.dev>',
          to: [propertyData.email],
          subject: emailSubject,
          html: createEmailHtml('property contact'),
        })
      );
    }

    // Send to practice leader if provided
    if (propertyData.practice_leader_email) {
      console.log('Sending email to practice leader:', propertyData.practice_leader_email);
      emailPromises.push(
        resend.emails.send({
          from: 'Property Manager <onboarding@resend.dev>',
          to: [propertyData.practice_leader_email],
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