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
    console.log('🚀 Function called with URL:', req.url);
    
    const url = new URL(req.url);
    let propertyId = url.searchParams.get('propertyId');
    
    // Also try to get from request body if not in URL params
    if (!propertyId && req.method === 'POST') {
      try {
        const body = await req.json();
        console.log('📝 Request body:', body);
        propertyId = body.propertyId;
      } catch (bodyError) {
        console.error('❌ Error parsing body:', bodyError);
      }
    }

    console.log('🔍 Property ID:', propertyId);

    if (!propertyId) {
      console.log('❌ No property ID provided');
      return new Response(
        JSON.stringify({ error: 'Property ID is required' }),
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

    // Fetch property data
    const { data: propertyData, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .maybeSingle();

    if (propertyError) {
      console.error('Error fetching property:', propertyError);
      return new Response(
        JSON.stringify({ error: 'Failed to load property information' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!propertyData) {
      return new Response(
        JSON.stringify({ error: 'Property not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch maintenance requests for this property
    const { data: requestsData, error: requestsError } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('Error fetching requests:', requestsError);
      // Don't fail the whole request for maintenance requests error
    }

    // Transform property data
    const transformedProperty = {
      id: propertyData.id,
      name: propertyData.name,
      address: propertyData.address,
      contactNumber: propertyData.contact_number,
      email: propertyData.email,
      practiceLeader: propertyData.practice_leader,
      practiceLeaderEmail: propertyData.practice_leader_email || '',
      practiceLeaderPhone: propertyData.practice_leader_phone || '',
      renewalDate: propertyData.renewal_date || '',
      rentAmount: propertyData.rent_amount || 0,
      rentPeriod: propertyData.rent_period || 'month',
      createdAt: propertyData.created_at,
      landlordId: propertyData.landlord_id
    };

    // Transform requests data
    const transformedRequests = (requestsData || []).map((req: any) => ({
      id: req.id,
      isParticipantRelated: req.is_participant_related || false,
      participantName: req.participant_name || '',
      attemptedFix: req.attempted_fix || '',
      issueNature: req.issue_nature || '',
      explanation: req.explanation || '',
      location: req.location || '',
      reportDate: req.report_date || '',
      site: req.site || '',
      submittedBy: req.submitted_by || '',
      status: req.status || 'pending',
      title: req.title || '',
      description: req.description || '',
      category: req.category || '',
      priority: req.priority || 'medium',
      propertyId: req.property_id,
      createdAt: req.created_at,
      updatedAt: req.updated_at,
      assignedTo: req.assigned_to,
      dueDate: req.due_date,
      attachments: req.attachments,
      history: req.history,
      userId: req.user_id || '',
    }));

    return new Response(
      JSON.stringify({
        property: transformedProperty,
        requests: transformedRequests
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-public-property function:', error);
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});