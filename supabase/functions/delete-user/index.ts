
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0'

interface RequestBody {
  userId: string;
}

serve(async (req: Request) => {
  // Create a Supabase client with the admin role
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  try {
    // Parse request body
    const body = await req.json() as RequestBody;
    const { userId } = body;
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // First delete the user profile
    // Convert string ID to number since the database expects a number
    const { error: profileError } = await supabaseClient
      .from('user_profiles')
      .delete()
      .eq('id', Number(userId));
      
    if (profileError) {
      throw profileError;
    }
    
    // Then delete the auth user (if needed)
    // Note: In many cases with proper RLS, deleting the auth user
    // might be sufficient as it would cascade to the profile
    
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
})
