import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestCredential {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'manager' | 'contractor';
}

const TEST_CREDENTIALS: TestCredential[] = [
  {
    email: 'admin@test.com',
    password: 'Test123!@#',
    name: 'Admin User',
    role: 'admin'
  },
  {
    email: 'manager@test.com', 
    password: 'Test123!@#',
    name: 'Manager User',
    role: 'manager'
  },
  {
    email: 'contractor@test.com',
    password: 'Test123!@#', 
    name: 'Contractor User',
    role: 'contractor'
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const results: { role: string; success: boolean; message: string }[] = [];

    for (const credential of TEST_CREDENTIALS) {
      try {
        console.log(`Creating ${credential.role} user: ${credential.email}`);
        
        // Create user with Supabase admin API
        const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
          email: credential.email,
          password: credential.password,
          email_confirm: true,
          user_metadata: {
            name: credential.name,
            role: credential.role
          }
        });
        
        if (authError) {
          console.error(`Auth error for ${credential.role}:`, authError);
          results.push({
            role: credential.role,
            success: false,
            message: `Failed to create ${credential.role} user: ${authError.message}`
          });
          continue;
        }
        
        if (authData.user) {
          // Create profile entry
          const { error: profileError } = await supabaseClient
            .from('profiles')
            .insert({
              id: authData.user.id,
              name: credential.name,
              email: credential.email,
              role: credential.role,
              assigned_properties: credential.role === 'manager' ? [] : null
            });
          
          if (profileError) {
            console.error(`Profile error for ${credential.role}:`, profileError);
            results.push({
              role: credential.role,
              success: false,
              message: `Failed to create profile for ${credential.role}: ${profileError.message}`
            });
          } else {
            results.push({
              role: credential.role,
              success: true,
              message: `${credential.role} user created successfully`
            });
            console.log(`✅ ${credential.role} user created: ${credential.email}`);
          }
        }
      } catch (error: any) {
        results.push({
          role: credential.role,
          success: false,
          message: `Error creating ${credential.role} user: ${error.message}`
        });
        console.error(`❌ Error creating ${credential.role} user:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        credentials: TEST_CREDENTIALS.map(c => ({
          email: c.email,
          password: c.password,
          role: c.role,
          name: c.name
        }))
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})