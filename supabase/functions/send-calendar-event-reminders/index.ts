import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Calculate the target event date (1 business day from today)
function getTargetDateForReminder(): string {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  
  let daysToAdd = 1; // Default: tomorrow
  
  // If today is Friday (5), target Monday (add 3 days)
  if (dayOfWeek === 5) daysToAdd = 3;
  // If today is Saturday (6), target Monday (add 2 days)
  else if (dayOfWeek === 6) daysToAdd = 2;
  // If today is Sunday (0), target Monday (add 1 day)
  // else daysToAdd = 1 (default - tomorrow)
  
  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() + daysToAdd);
  
  return targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
}

// Format time from HH:MM:SS to readable format
function formatTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

// Format date for display
function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-AU', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📅 Calendar Event Reminders: Starting...');
    
    const resendApiKey = Deno.env.get('NEW_RESEND_API_KEY') || 
                         Deno.env.get('RESEND_API_KEY') || 
                         Deno.env.get('RESEND_API_KEY_1');
    if (!resendApiKey) {
      throw new Error('Resend API key not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const targetDate = getTargetDateForReminder();
    console.log(`📅 Target event date: ${targetDate}`);

    // Fetch events for target date that haven't had reminders sent
    const { data: events, error: eventsError } = await supabase
      .from('calendar_events')
      .select(`
        id,
        title,
        description,
        event_date,
        start_time,
        end_time,
        property_id,
        organization_id,
        source_type
      `)
      .eq('event_date', targetDate)
      .eq('notification_sent', false)
      .not('property_id', 'is', null);

    if (eventsError) {
      console.error('Error fetching events:', eventsError);
      throw new Error('Failed to fetch calendar events');
    }

    if (!events || events.length === 0) {
      console.log('📅 No events found for target date requiring reminders');
      return new Response(
        JSON.stringify({ success: true, message: 'No events requiring reminders', eventsProcessed: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`📅 Found ${events.length} event(s) requiring reminders`);

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    let totalEmailsSent = 0;
    let totalNotificationsCreated = 0;

    // Helper function to check email notification preference
    const hasEmailNotificationsEnabled = async (email: string): Promise<boolean> => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('notification_settings')
          .eq('email', email)
          .single();
        
        if (error || !data) return true; // Default to enabled
        const settings = data.notification_settings as any;
        return settings?.emailNotifications !== false;
      } catch {
        return true;
      }
    };

    // Helper function to check app notification preference
    const hasAppNotificationsEnabled = async (userId: string): Promise<boolean> => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('notification_settings')
          .eq('id', userId)
          .single();
        
        if (error || !data) return true;
        const settings = data.notification_settings as any;
        return settings?.appNotifications !== false;
      } catch {
        return true;
      }
    };

    // Create email HTML template
    const createEmailHtml = (event: any, propertyData: any, recipientType: string) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Calendar Event Reminder</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #7c3aed; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">📅 Event Reminder</h1>
            <p style="margin: 10px 0 0 0; font-size: 14px;">You have an upcoming event tomorrow</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">${event.title}</h3>
            <p><strong>📆 Date:</strong> ${formatEventDate(event.event_date)}</p>
            ${event.start_time ? `<p><strong>🕐 Time:</strong> ${formatTime(event.start_time)}${event.end_time ? ` - ${formatTime(event.end_time)}` : ''}</p>` : ''}
            ${event.description ? `<p><strong>📝 Details:</strong> ${event.description}</p>` : ''}
            <p><strong>📍 Property:</strong> ${propertyData.name}</p>
            <p><strong>📫 Address:</strong> ${propertyData.address}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get('APPLICATION_URL') || 'https://housinghub.app'}/properties/${event.property_id}" 
               style="display: inline-block; background-color: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
              View Property Calendar
            </a>
          </div>

          <p style="color: #666; font-size: 14px; margin-top: 20px;">
            You are receiving this email as the ${recipientType} for this property.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <div style="text-align: center; color: #6b7280; font-size: 12px;">
            <p>HousingHub - Property Management Made Simple</p>
            <p>This is an automated reminder from your calendar management system.</p>
          </div>
        </body>
      </html>
    `;

    // Process each event
    for (const event of events) {
      console.log(`📅 Processing event: "${event.title}" (ID: ${event.id})`);

      // Fetch property details
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select('name, address, email, practice_leader_email, organization_id')
        .eq('id', event.property_id)
        .single();

      if (propertyError || !propertyData) {
        console.error(`Failed to fetch property for event ${event.id}:`, propertyError);
        continue;
      }

      const sentEmails = new Set<string>();

      // 1. Send to property contact email
      if (propertyData.email) {
        const hasPreference = await hasEmailNotificationsEnabled(propertyData.email);
        if (hasPreference && !sentEmails.has(propertyData.email)) {
          console.log(`  → Sending email to property contact: ${propertyData.email}`);
          try {
            await resend.emails.send({
              from: 'HousingHub <notifications@housinghub.app>',
              to: [propertyData.email],
              subject: `📅 Reminder: ${event.title} - Tomorrow`,
              html: createEmailHtml(event, propertyData, 'property contact'),
            });
            sentEmails.add(propertyData.email);
            totalEmailsSent++;
            await delay(600);
          } catch (emailError) {
            console.error(`Failed to send email to ${propertyData.email}:`, emailError);
          }
        }
      }

      // 2. Send to practice leader
      if (propertyData.practice_leader_email && !sentEmails.has(propertyData.practice_leader_email)) {
        const hasPreference = await hasEmailNotificationsEnabled(propertyData.practice_leader_email);
        if (hasPreference) {
          console.log(`  → Sending email to practice leader: ${propertyData.practice_leader_email}`);
          try {
            await resend.emails.send({
              from: 'HousingHub <notifications@housinghub.app>',
              to: [propertyData.practice_leader_email],
              subject: `📅 Reminder: ${event.title} - Tomorrow`,
              html: createEmailHtml(event, propertyData, 'practice leader'),
            });
            sentEmails.add(propertyData.practice_leader_email);
            totalEmailsSent++;
            await delay(600);
          } catch (emailError) {
            console.error(`Failed to send email to ${propertyData.practice_leader_email}:`, emailError);
          }
        }
      }

      // 3. Find and notify assigned managers
      const { data: assignedManagers, error: managersError } = await supabase
        .from('profiles')
        .select('id, email, name, notification_settings')
        .eq('role', 'manager')
        .eq('organization_id', event.organization_id)
        .contains('assigned_properties', [event.property_id]);

      if (managersError) {
        console.error('Error fetching assigned managers:', managersError);
      }

      if (assignedManagers && assignedManagers.length > 0) {
        console.log(`  → Found ${assignedManagers.length} assigned manager(s)`);
        
        for (const manager of assignedManagers) {
          // Send email if not already sent
          if (!sentEmails.has(manager.email)) {
            const hasEmailPref = await hasEmailNotificationsEnabled(manager.email);
            if (hasEmailPref) {
              console.log(`    → Sending email to manager: ${manager.email}`);
              try {
                await resend.emails.send({
                  from: 'HousingHub <notifications@housinghub.app>',
                  to: [manager.email],
                  subject: `📅 Reminder: ${event.title} - Tomorrow`,
                  html: createEmailHtml(event, propertyData, 'assigned property manager'),
                });
                sentEmails.add(manager.email);
                totalEmailsSent++;
                await delay(600);
              } catch (emailError) {
                console.error(`Failed to send email to manager ${manager.email}:`, emailError);
              }
            }
          }

          // Create in-app notification
          const hasAppPref = await hasAppNotificationsEnabled(manager.id);
          if (hasAppPref) {
            try {
              await supabase.from('notifications').insert({
                user_id: manager.id,
                title: '📅 Event Reminder',
                message: `Reminder: "${event.title}" is scheduled for tomorrow at ${propertyData.name}`,
                type: 'info',
                link: `/properties/${event.property_id}`,
                organization_id: event.organization_id
              });
              totalNotificationsCreated++;
              console.log(`    → Created in-app notification for manager: ${manager.name}`);
            } catch (notifError) {
              console.error(`Failed to create notification for manager ${manager.id}:`, notifError);
            }
          }
        }
      }

      // Mark event as notification sent
      const { error: updateError } = await supabase
        .from('calendar_events')
        .update({ notification_sent: true })
        .eq('id', event.id);

      if (updateError) {
        console.error(`Failed to mark event ${event.id} as notified:`, updateError);
      } else {
        console.log(`  ✅ Event ${event.id} marked as notification_sent`);
      }
    }

    console.log(`📅 Completed: ${totalEmailsSent} emails sent, ${totalNotificationsCreated} in-app notifications created`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Calendar event reminders processed',
        eventsProcessed: events.length,
        emailsSent: totalEmailsSent,
        notificationsCreated: totalNotificationsCreated
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('❌ Error in send-calendar-event-reminders:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
