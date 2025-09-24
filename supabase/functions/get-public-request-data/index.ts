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
        JSON.stringify({ error: 'Request not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ [GET-PUBLIC-REQUEST-DATA] Request found:', request.issue_nature || request.title);

    // Return the request data
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
        userId: request.user_id
      }
    };

    console.log('📦 [GET-PUBLIC-REQUEST-DATA] Returning response');
    
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
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});