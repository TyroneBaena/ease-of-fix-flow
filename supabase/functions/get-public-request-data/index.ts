import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 [GET-PUBLIC-REQUEST-DATA] Starting request data fetch...');
    
    // Get request ID from URL parameters
    const url = new URL(req.url);
    const requestId = url.searchParams.get('requestId');
    
    console.log('📝 [GET-PUBLIC-REQUEST-DATA] Request ID:', requestId);

    if (!requestId) {
      console.error('❌ [GET-PUBLIC-REQUEST-DATA] No request ID provided');
      return new Response(
        JSON.stringify({ error: 'Request ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('🔗 [GET-PUBLIC-REQUEST-DATA] Supabase client initialized');

    // Fetch the maintenance request by ID
    console.log('📊 [GET-PUBLIC-REQUEST-DATA] Fetching maintenance request...');
    const { data: request, error: requestError } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError) {
      console.error('❌ [GET-PUBLIC-REQUEST-DATA] Error fetching request:', requestError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch request data' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!request) {
      console.log('❌ [GET-PUBLIC-REQUEST-DATA] Request not found');
      return new Response(
        JSON.stringify({ 
          error: 'Request not found',
          details: 'The maintenance request you are trying to access may have been deleted or the QR code may be invalid. Please contact your property manager.'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ [GET-PUBLIC-REQUEST-DATA] Request found:', request.issue_nature || request.title);

    // Fetch activity logs for this request
    console.log('📊 [GET-PUBLIC-REQUEST-DATA] Fetching activity logs...');
    const { data: activityLogs, error: activityError } = await supabase
      .from('activity_logs')
      .select('id, action_type, description, actor_name, actor_role, metadata, created_at, request_id')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (activityError) {
      console.error('⚠️ [GET-PUBLIC-REQUEST-DATA] Error fetching activity logs:', activityError);
    } else {
      console.log('✅ [GET-PUBLIC-REQUEST-DATA] Activity logs found:', activityLogs?.length || 0);
    }

    // Fetch property data if request has a property_id
    let propertyData = null;
    if (request.property_id) {
      console.log('📊 [GET-PUBLIC-REQUEST-DATA] Fetching property data...');
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('id, name, address')
        .eq('id', request.property_id)
        .single();

      if (propertyError) {
        console.error('⚠️ [GET-PUBLIC-REQUEST-DATA] Error fetching property:', propertyError);
      } else {
        propertyData = property;
        console.log('✅ [GET-PUBLIC-REQUEST-DATA] Property found:', property?.name);
      }
    }

    // Fetch contractor data if request has a contractor_id
    let contractorData = null;
    if (request.contractor_id) {
      console.log('📊 [GET-PUBLIC-REQUEST-DATA] Fetching contractor data...');
      const { data: contractor, error: contractorError } = await supabase
        .from('contractors')
        .select('id, company_name, contact_name')
        .eq('id', request.contractor_id)
        .single();

      if (contractorError) {
        console.error('⚠️ [GET-PUBLIC-REQUEST-DATA] Error fetching contractor:', contractorError);
      } else {
        contractorData = contractor;
        console.log('✅ [GET-PUBLIC-REQUEST-DATA] Contractor found:', contractor?.company_name);
      }
    }

    // Return the request data with additional context
    const response = {
      request: {
        id: request.id,
        title: request.title,
        description: request.description,
        issueNature: request.issue_nature,
        explanation: request.explanation,
        location: request.location,
        site: request.site,
        status: request.status,
        priority: request.priority,
        submittedBy: request.submitted_by,
        assignedTo: request.assigned_to,
        reportDate: request.report_date,
        createdAt: request.created_at,
        updatedAt: request.updated_at,
        dueDate: request.due_date,
        attachments: request.attachments,
        isParticipantRelated: request.is_participant_related,
        participantName: request.participant_name,
        attemptedFix: request.attempted_fix,
        completionPercentage: request.completion_percentage || 0,
        contractorId: request.contractor_id,
        userId: request.user_id,
        propertyId: request.property_id
      },
      activityLogs: activityLogs || [],
      property: propertyData,
      contractor: contractorData
    };

    console.log('📦 [GET-PUBLIC-REQUEST-DATA] Returning response with', activityLogs?.length || 0, 'activity logs');
    
    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 [GET-PUBLIC-REQUEST-DATA] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred',
        details: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
