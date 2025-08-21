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
    email: 'plumber@test.com',
    password: 'Test123!@#', 
    name: 'Mike Johnson',
    role: 'contractor'
  },
  {
    email: 'electrician@test.com',
    password: 'Test123!@#', 
    name: 'Sarah Wilson',
    role: 'contractor'
  },
  {
    email: 'handyman@test.com',
    password: 'Test123!@#', 
    name: 'David Brown',
    role: 'contractor'
  }
];

// Helper functions to get contractor-specific data
function getContractorCompany(email: string): string {
  switch (email) {
    case 'plumber@test.com':
      return 'Johnson Plumbing Services';
    case 'electrician@test.com':
      return 'Wilson Electrical & HVAC';
    case 'handyman@test.com':
      return 'Brown General Contracting';
    default:
      return 'Test Contractor Company';
  }
}

function getContractorPhone(email: string): string {
  switch (email) {
    case 'plumber@test.com':
      return '+1 (555) 123-4567';
    case 'electrician@test.com':
      return '+1 (555) 234-5678';
    case 'handyman@test.com':
      return '+1 (555) 345-6789';
    default:
      return '+1 (555) 000-0000';
  }
}

function getContractorAddress(email: string): string {
  switch (email) {
    case 'plumber@test.com':
      return '123 Plumber St, Water City, WC 12345';
    case 'electrician@test.com':
      return '456 Electric Ave, Power Town, PT 23456';
    case 'handyman@test.com':
      return '789 Repair Rd, Fix City, FC 34567';
    default:
      return '123 Test St, Test City, TC 12345';
  }
}

function getContractorSpecialties(email: string): string[] {
  switch (email) {
    case 'plumber@test.com':
      return ['Plumbing', 'Water Damage', 'Pipe Repair'];
    case 'electrician@test.com':
      return ['Electrical', 'HVAC', 'Lighting'];
    case 'handyman@test.com':
      return ['Carpentry', 'Painting', 'General Maintenance'];
    default:
      return ['General'];
  }
}

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
            
            // For contractors, check if contractor record already exists
            if (credential.role === 'contractor') {
              const normalizedEmail = credential.email.toLowerCase().trim();
              const { data: existingContractor, error: checkError } = await supabaseClient
                .from('contractors')
                .select('*')
                .eq('email', normalizedEmail)
                .maybeSingle();

              if (checkError) {
                console.error(`Error checking existing contractor for ${credential.email}:`, checkError);
                results.push({
                  role: credential.role,
                  success: false,
                  message: `Failed to check existing contractor: ${checkError.message}`
                });
                continue;
              }

              if (existingContractor) {
                console.log(`Contractor with email ${normalizedEmail} already exists, skipping`);
                results.push({
                  role: credential.role,
                  success: true,
                  message: `${credential.role} already exists (skipped)`
                });
                continue;
              }
            }
            
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
              
              // If user already exists, try to get existing user and update contractor record if needed
              if (authError.message?.includes('already been registered') && credential.role === 'contractor') {
                console.log(`Auth user exists for ${credential.email}, checking if contractor record exists`);
                
                // Get existing user
                const { data: { users }, error: getUserError } = await supabaseClient.auth.admin.listUsers();
                if (getUserError) {
                  console.error(`Error getting existing users:`, getUserError);
                  results.push({
                    role: credential.role,
                    success: false,
                    message: `Failed to get existing user: ${getUserError.message}`
                  });
                  continue;
                }
                
                const existingUser = users.find(user => user.email === credential.email);
                if (existingUser) {
                  // Check if contractor record exists for this user
                  const { data: existingContractor, error: contractorCheckError } = await supabaseClient
                    .from('contractors')
                    .select('*')
                    .eq('user_id', existingUser.id)
                    .maybeSingle();

                  if (contractorCheckError) {
                    console.error(`Error checking contractor by user_id:`, contractorCheckError);
                    results.push({
                      role: credential.role,
                      success: false,
                      message: `Failed to check contractor record: ${contractorCheckError.message}`
                    });
                    continue;
                  }

                  if (existingContractor) {
                    console.log(`Contractor record already exists for user ${existingUser.id}, skipping`);
                    results.push({
                      role: credential.role,
                      success: true,
                      message: `${credential.role} user and contractor already exist (skipped)`
                    });
                    continue;
                  } else {
                    // Create contractor record for existing auth user
                    const contractorData = {
                      user_id: existingUser.id,
                      company_name: getContractorCompany(credential.email),
                      contact_name: credential.name,
                      email: credential.email,
                      phone: getContractorPhone(credential.email),
                      address: getContractorAddress(credential.email),
                      specialties: getContractorSpecialties(credential.email)
                    };

                    const { error: contractorError } = await supabaseClient
                      .from('contractors')
                      .insert(contractorData);

                    if (contractorError) {
                      console.error(`Contractor creation error:`, contractorError);
                      results.push({
                        role: credential.role,
                        success: false,
                        message: `Failed to create contractor record: ${contractorError.message}`
                      });
                    } else {
                      results.push({
                        role: credential.role,
                        success: true,
                        message: `${credential.role} contractor record created for existing user`
                      });
                      console.log(`✅ contractor record created for existing user: ${credential.email}`);
                    }
                    continue;
                  }
                }
              }
              
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
            // If this is a contractor, also create contractor record
            if (credential.role === 'contractor') {
              const contractorData = {
                user_id: authData.user.id,
                company_name: getContractorCompany(credential.email),
                contact_name: credential.name,
                email: credential.email,
                phone: getContractorPhone(credential.email),
                address: getContractorAddress(credential.email),
                specialties: getContractorSpecialties(credential.email)
              };

              const { error: contractorError } = await supabaseClient
                .from('contractors')
                .insert(contractorData);

              if (contractorError) {
                console.error(`Contractor error for ${credential.role}:`, contractorError);
                results.push({
                  role: credential.role,
                  success: false,
                  message: `Failed to create contractor record for ${credential.role}: ${contractorError.message}`
                });
              } else {
                results.push({
                  role: credential.role,
                  success: true,
                  message: `${credential.role} user and contractor record created successfully`
                });
                console.log(`✅ ${credential.role} user and contractor created: ${credential.email}`);
              }
            } else {
              results.push({
                role: credential.role,
                success: true,
                message: `${credential.role} user created successfully`
              });
              console.log(`✅ ${credential.role} user created: ${credential.email}`);
            }
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