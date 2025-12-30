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
    const propertyId = url.searchParams.get('propertyId');

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
      console.log('❌ [DEBUG] Property not found for ID:', propertyId);
      return new Response(
        JSON.stringify({ 
          error: 'Property not found',
          details: 'The property you are trying to access may have been deleted or the QR code may be invalid. Please contact your property manager.'
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ [DEBUG] Property found:', propertyData.name);

    // Fetch budget categories for the property's organization
    const { data: budgetCategoriesData, error: budgetError } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('organization_id', propertyData.organization_id)
      .order('name');

    console.log('📊 [DEBUG] Budget categories query result:', { data: budgetCategoriesData, error: budgetError });

    if (budgetError) {
      console.error('❌ [DEBUG] Error fetching budget categories:', budgetError);
      // Don't fail the whole request for budget categories error
    }

    // Fetch existing maintenance requests for this property
    const { data: requestsData, error: requestsError } = await supabase
      .from('maintenance_requests')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    console.log('📋 [DEBUG] Maintenance requests query result:', { data: requestsData, error: requestsError });

    // Fetch non-archived housemates for this property
    const { data: housematesData, error: housematesError } = await supabase
      .from('housemates')
      .select('id, first_name, last_name')
      .eq('property_id', propertyId)
      .eq('is_archived', false)
      .order('last_name');

    console.log('👥 [DEBUG] Housemates query result:', { data: housematesData, error: housematesError });

    if (housematesError) {
      console.error('❌ [DEBUG] Error fetching housemates:', housematesError);
      // Don't fail the whole request for housemates error
    }

    // Transform property data (excluding sensitive rent information for public access)
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
      // SECURITY: Rent data excluded from public access
      createdAt: propertyData.created_at,
      organizationId: propertyData.organization_id
    };

    // Transform budget categories
    const transformedBudgetCategories = (budgetCategoriesData || []).map((category: any) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      organizationId: category.organization_id,
      createdAt: category.created_at,
      updatedAt: category.updated_at
    }));

    // Transform maintenance requests
    const transformedRequests = (requestsData || []).map((request: any) => ({
      id: request.id,
      title: request.title,
      description: request.description,
      status: request.status,
      priority: request.priority,
      location: request.location,
      issueNature: request.issue_nature || request.title,
      explanation: request.explanation || request.description,
      submittedBy: request.submitted_by,
      createdAt: request.created_at,
      site: request.site || request.location
    }));

    // Transform housemates
    const transformedHousemates = (housematesData || []).map((housemate: any) => ({
      id: housemate.id,
      firstName: housemate.first_name,
      lastName: housemate.last_name
    }));

    console.log('✅ [DEBUG] Property, budget categories, and housemates loaded successfully');
    console.log('📊 [DEBUG] Returning data:', {
      property: transformedProperty.name,
      budgetCategoriesCount: transformedBudgetCategories.length,
      requestsCount: transformedRequests.length,
      housematesCount: transformedHousemates.length
    });

    // Log public link access (non-blocking)
    try {
      const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const userAgent = req.headers.get('user-agent') || 'unknown';
      
      await supabase.from('public_link_access_logs').insert({
        organization_id: propertyData.organization_id,
        property_id: propertyId,
        property_name: propertyData.name,
        access_type: 'page_view',
        ip_address: clientIp,
        user_agent: userAgent,
        metadata: { source: 'qr_code_or_direct_link' }
      });
      console.log('📊 Public link access logged');
    } catch (logError) {
      console.error('Failed to log public link access (non-blocking):', logError);
    }

    return new Response(
      JSON.stringify({
        property: transformedProperty,
        budgetCategories: transformedBudgetCategories,
        requests: transformedRequests,
        housemates: transformedHousemates
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-public-property-data function:', error);
    return new Response(
      JSON.stringify({ error: 'Something went wrong. Please try again.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});