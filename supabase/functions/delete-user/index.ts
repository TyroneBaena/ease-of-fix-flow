
// Deno imports for Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RequestBody {
  userId: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
      console.error("Missing userId in request");
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Deleting user with ID: ${userId}`);
    
    // CRITICAL: Delete all related data FIRST before deleting auth user
    // This prevents foreign key constraint errors
    
    // 1. Delete from profiles (cascades to most other tables via user_id FK)
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileError) {
      console.error("Error deleting user profile:", profileError);
      throw new Error(`Failed to delete user profile: ${profileError.message}`);
    }
    
    console.log(`Profile deleted for user ${userId}`);
    
    // 2. Delete from user_organizations (if not cascaded)
    const { error: userOrgError } = await supabaseClient
      .from('user_organizations')
      .delete()
      .eq('user_id', userId);
    
    if (userOrgError) {
      console.warn("Warning deleting user_organizations:", userOrgError);
      // Don't fail if this doesn't exist
    }
    
    // 3. Delete from user_roles (if not cascaded)
    const { error: userRoleError } = await supabaseClient
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    
    if (userRoleError) {
      console.warn("Warning deleting user_roles:", userRoleError);
      // Don't fail if this doesn't exist
    }
    
    // 4. Delete from subscribers (CRITICAL: prevents duplicate email constraint issues)
    const { error: subscriberError } = await supabaseClient
      .from('subscribers')
      .delete()
      .eq('user_id', userId);
    
    if (subscriberError) {
      console.warn("Warning deleting subscribers:", subscriberError);
      // Don't fail if this doesn't exist
    }
    
    console.log(`Subscriber deleted for user ${userId}`);
    
    // 5. Now delete the auth user
    const { error: authError } = await supabaseClient.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error("Error deleting auth user:", authError);
      throw new Error(`Failed to delete auth user: ${authError.message}`);
    }
    
    console.log(`User ${userId} deleted successfully from auth`);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Delete user error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
