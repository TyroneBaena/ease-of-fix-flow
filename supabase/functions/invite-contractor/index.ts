
import { serve } from "https://deno.land/std@0.172.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    // Create Supabase clients - one with service role for admin operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Get the JWT from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Verify the JWT and get the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { 
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Ensure user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
      
    if (profileError || profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin access required' }), { 
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Parse request body
    const { email, name, specialty } = await req.json();
    
    if (!email || !name || !specialty) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    // Generate a temporary password
    const tempPassword = Array(16)
      .fill(0)
      .map(() => Math.random().toString(36).charAt(2))
      .join('');
    
    // Create the user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name,
        role: 'contractor',
        specialty,
      }
    });
    
    if (createError) {
      return new Response(JSON.stringify({ error: `Failed to create user: ${createError.message}` }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Verify schema was created via trigger
    const { data: schemaCheck, error: schemaError } = await supabaseAdmin
      .from('tenant_schemas')
      .select('schema_name')
      .eq('user_id', newUser.user.id)
      .single();
      
    if (schemaError) {
      console.log("Schema wasn't automatically created, triggering manual creation");
      
      // Manually create schema if trigger didn't work
      const { error: rpcError } = await supabaseAdmin.rpc('create_tenant_schema', {
        new_user_id: newUser.user.id
      });
      
      if (rpcError) {
        console.error("Error creating schema manually:", rpcError);
      }
    }
    
    // Create contractor entry
    const { data: contractor, error: contractorError } = await supabaseAdmin
      .from('contractors')
      .insert([
        { 
          company_name: name,
          contact_name: name,
          email: normalizedEmail,
          phone: '',
          specialties: [specialty],
          user_id: newUser.user.id
        }
      ])
      .select()
      .single();
    
    if (contractorError) {
      console.error("Error creating contractor record:", contractorError);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "User created but contractor profile had issues",
        userId: newUser.user.id,
        email: normalizedEmail,
        loginUrl: `${Deno.env.get('APPLICATION_URL') || ''}/login?email=${encodeURIComponent(normalizedEmail)}&setupPassword=true`
      }), { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Contractor invited successfully",
      userId: newUser.user.id,
      email: normalizedEmail,
      contractorId: contractor.id,
      loginUrl: `${Deno.env.get('APPLICATION_URL') || ''}/login?email=${encodeURIComponent(normalizedEmail)}&setupPassword=true`
    }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
