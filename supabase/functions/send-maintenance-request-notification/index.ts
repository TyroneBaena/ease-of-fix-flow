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
    
    // Get admin and manager users from the same organization
    const { data: adminUsers, error: adminError } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('role', 'admin')
      .eq('organization_id', requestData.organization_id);

    const { data: managerUsers, error: managerError } = await supabase
      .from('profiles')
      .select('id, organization_id')
      .eq('role', 'manager')
      .eq('organization_id', requestData.organization_id);

    // Find managers specifically assigned to this property
    const { data: assignedManagers, error: assignedManagersError } = await supabase
      .from('profiles')
      .select('id, email, name, notification_settings')
      .eq('role', 'manager')
      .eq('organization_id', requestData.organization_id)
      .contains('assigned_properties', [requestData.property_id]);

    if (adminError) console.error('Error fetching admin users:', adminError);
    if (managerError) console.error('Error fetching manager users:', managerError);
    if (assignedManagersError) console.error('Error fetching assigned managers:', assignedManagersError);

    console.log(`Found ${assignedManagers?.length || 0} managers assigned to this property`);

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
    const directLink = `${Deno.env.get('APPLICATION_URL') || 'https://housinghub.app'}/requests/${request_id}`;

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
    const sentEmails = new Set<string>(); // Track sent emails to avoid duplicates

    // Helper function to check if user has email notifications enabled
    const hasEmailNotificationsEnabled = async (email: string): Promise<boolean> => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('notification_settings')
          .eq('email', email)
          .single();
        
        if (error || !data) {
          console.log(`No profile found for ${email}, defaulting to enabled`);
          return true; // Default to enabled if profile not found
        }
        
        const settings = data.notification_settings as any;
        const isEnabled = settings?.emailNotifications !== false;
        console.log(`Email notifications for ${email}: ${isEnabled ? 'enabled' : 'disabled'}`);
        return isEnabled;
      } catch (error) {
        console.error(`Error checking notification preferences for ${email}:`, error);
        return true; // Default to enabled on error
      }
    };

    // Send to property contact email (check preferences first)
    if (propertyData.email) {
      const hasPreference = await hasEmailNotificationsEnabled(propertyData.email);
      
      if (hasPreference) {
        console.log('Sending email to property contact:', propertyData.email);
        const emailResult = await resend.emails.send({
          from: 'Property Manager <noreply@housinghub.app>',
          to: [propertyData.email],
          subject: emailSubject,
          html: createEmailHtml('property contact'),
        });
        
        console.log('Email send result:', emailResult);
        emailPromises.push(emailResult);
        sentEmails.add(propertyData.email);
      } else {
        console.log('Property contact has email notifications disabled:', propertyData.email);
      }
    }

    // Send to practice leader if provided (check preferences first)
    if (propertyData.practice_leader_email) {
      const hasPreference = await hasEmailNotificationsEnabled(propertyData.practice_leader_email);
      
      if (hasPreference) {
        console.log('Sending email to practice leader:', propertyData.practice_leader_email);
        const practiceLeaderResult = await resend.emails.send({
          from: 'Property Manager <noreply@housinghub.app>',
          to: [propertyData.practice_leader_email],
          subject: emailSubject,
          html: createEmailHtml('practice leader'),
        });
        
        console.log('Practice leader email send result:', practiceLeaderResult);
        emailPromises.push(practiceLeaderResult);
        sentEmails.add(propertyData.practice_leader_email);
      } else {
        console.log('Practice leader has email notifications disabled:', propertyData.practice_leader_email);
      }
    }

    // Send to assigned managers (check preferences and avoid duplicates)
    if (assignedManagers && assignedManagers.length > 0) {
      console.log(`Processing ${assignedManagers.length} assigned manager(s) for email notifications`);
      
      for (const manager of assignedManagers) {
        // Skip if already sent (e.g., manager is also property contact or practice leader)
        if (sentEmails.has(manager.email)) {
          console.log(`Skipping duplicate email for manager ${manager.email}`);
          continue;
        }
        
        const hasPreference = await hasEmailNotificationsEnabled(manager.email);
        
        if (hasPreference) {
          console.log(`Sending email to assigned manager: ${manager.email} (${manager.name})`);
          const managerEmailResult = await resend.emails.send({
            from: 'Property Manager <noreply@housinghub.app>',
            to: [manager.email],
            subject: emailSubject,
            html: createEmailHtml('assigned property manager'),
          });
          
          console.log('Manager email send result:', managerEmailResult);
          emailPromises.push(managerEmailResult);
          sentEmails.add(manager.email);
        } else {
          console.log(`Manager ${manager.email} has email notifications disabled`);
        }
      }
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

    // Wait for all emails to complete and get results
    const emailResults = await Promise.allSettled(emailPromises);
    
    const successful = emailResults.filter(result => 
      result.status === 'fulfilled' && !result.value.error
    ).length;
    const failed = emailResults.filter(result => 
      result.status === 'rejected' || (result.status === 'fulfilled' && result.value.error)
    ).length;

    console.log(`Email sending complete. Successful: ${successful}, Failed: ${failed}`);

    // Log any failures with details
    emailResults.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Email ${index + 1} failed:`, result.reason);
      } else if (result.status === 'fulfilled' && result.value.error) {
        console.error(`Email ${index + 1} failed with error:`, result.value.error);
      } else if (result.status === 'fulfilled') {
        console.log(`Email ${index + 1} sent successfully:`, result.value);
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
        error: (error as Error).message || 'Failed to send notifications' 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);