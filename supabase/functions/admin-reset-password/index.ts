import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== ADMIN RESET PASSWORD FUNCTION ===");
    
    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the caller is authenticated and is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callerUser) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, message: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller is an admin
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', callerUser.id)
      .single();

    if (profileError || !callerProfile || callerProfile.role !== 'admin') {
      console.error("Caller is not an admin:", callerProfile?.role);
      return new Response(
        JSON.stringify({ success: false, message: "Only admins can reset passwords" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId, userEmail } = await req.json();
    
    if (!userId || !userEmail) {
      return new Response(
        JSON.stringify({ success: false, message: "userId and userEmail are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin ${callerUser.email} resetting password for user: ${userId} (${userEmail})`);

    // Verify the target user belongs to the same organization
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (targetError || !targetProfile) {
      console.error("Target user not found:", targetError);
      return new Response(
        JSON.stringify({ success: false, message: "User not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (targetProfile.organization_id !== callerProfile.organization_id) {
      console.error("Cross-organization password reset attempted");
      return new Response(
        JSON.stringify({ success: false, message: "Cannot reset password for users in other organizations" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a secure temporary password (12 characters with mix of chars)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let tempPassword = '';
    for (let i = 0; i < 12; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Update the user's password using admin privileges
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: tempPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ success: false, message: `Failed to reset password: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set must_change_password flag
    const { error: flagError } = await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', userId);

    if (flagError) {
      console.warn("Warning: Could not set must_change_password flag:", flagError);
      // Don't fail the operation, just log the warning
    }

    console.log(`✅ Password reset successful for ${userEmail}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Password has been reset to: ${tempPassword}`,
        userId,
        tempPassword // Return to admin so they can share with user
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error("Admin reset password error:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
