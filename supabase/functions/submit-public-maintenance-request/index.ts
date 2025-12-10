import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Public maintenance request submission started');
    
    const requestData = await req.json();
    console.log('📝 Request data:', requestData);

    const {
      propertyId,
      issueNature,
      explanation,
      location,
      reportDate,
      submittedBy,
      attemptedFix,
      priority,
      budgetCategoryId,
      attachments,
      isParticipantRelated,
      participantName
    } = requestData;

    // Validate required fields - category is optional for public submissions
    if (!propertyId || !issueNature || !explanation || !location || !reportDate || !submittedBy || !priority) {
      console.log('❌ Missing required fields:', { propertyId, issueNature, explanation, location, reportDate, submittedBy, priority });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate attachments - photos are mandatory for public submissions
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
      console.log('❌ Missing required attachments - photos are mandatory');
      return new Response(
        JSON.stringify({ error: 'At least one photo is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate participant name if participant-related
    if (isParticipantRelated && (!participantName || participantName === 'N/A')) {
      console.log('❌ Missing participant name for participant-related request');
      return new Response(
        JSON.stringify({ error: 'Participant name is required for participant-related requests' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // First, get the property to ensure it exists and get organization_id
    const { data: propertyData, error: propertyError } = await supabase
      .from('properties')
      .select('organization_id')
      .eq('id', propertyId)
      .maybeSingle();

    if (propertyError || !propertyData) {
      console.error('Property not found:', propertyError);
      return new Response(
        JSON.stringify({ error: 'Property not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Insert the maintenance request
    const { data: newRequest, error: insertError } = await supabase
      .from('maintenance_requests')
      .insert({
        property_id: propertyId,
        organization_id: propertyData.organization_id,
        title: issueNature,
        description: explanation,
        category: budgetCategoryId || 'General Maintenance',
        location: location,
        priority: priority,
        status: 'pending',
        is_participant_related: isParticipantRelated || false,
        participant_name: isParticipantRelated ? participantName : 'N/A',
        attempted_fix: attemptedFix || '',
        issue_nature: issueNature,
        explanation: explanation,
        report_date: reportDate,
        site: location,
        submitted_by: submittedBy,
        budget_category_id: budgetCategoryId,
        attachments: attachments || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting maintenance request:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to submit maintenance request' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Maintenance request submitted successfully:', newRequest.id);

    // Send email notifications (practice leader, property contact, and create in-app notifications)
    try {
      console.log('📧 Triggering email notifications for request:', newRequest.id);
      
      const notificationResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-maintenance-request-notification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({ request_id: newRequest.id }),
        }
      );

      const notificationResult = await notificationResponse.json();
      console.log('📧 Notification result:', notificationResult);
    } catch (notificationError) {
      // Log error but don't fail the submission
      console.error('⚠️ Failed to send notifications (non-blocking):', notificationError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        requestId: newRequest.id,
        message: 'Maintenance request submitted successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in submit-public-maintenance-request function:', error);
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});