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
      return new Response(
        JSON.stringify({ error: 'Property not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch budget categories for the property's organization
    const { data: budgetCategoriesData, error: budgetError } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('organization_id', propertyData.organization_id)
      .order('name');

    if (budgetError) {
      console.error('Error fetching budget categories:', budgetError);
      // Don't fail the whole request for budget categories error
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
      landlordId: propertyData.landlord_id,
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

    console.log('✅ Property and budget categories loaded successfully');

    return new Response(
      JSON.stringify({
        property: transformedProperty,
        budgetCategories: transformedBudgetCategories
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