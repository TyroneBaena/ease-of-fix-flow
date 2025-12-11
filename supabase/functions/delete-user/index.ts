
// Deno imports for Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0";

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
    
    // CRITICAL: Cancel Stripe subscription FIRST before deleting database records
    // This prevents orphaned billing
    
    // 0. Get subscriber data and cancel Stripe subscription if exists
    const { data: subscriber } = await supabaseClient
      .from('subscribers')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('user_id', userId)
      .single();
    
    if (subscriber?.stripe_subscription_id) {
      const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
      if (stripeKey) {
        try {
          const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
          await stripe.subscriptions.cancel(subscriber.stripe_subscription_id);
          console.log(`Cancelled Stripe subscription: ${subscriber.stripe_subscription_id}`);
        } catch (stripeError) {
          console.error("Error cancelling Stripe subscription:", stripeError);
          // Continue with deletion even if Stripe cancellation fails
        }
      }
    }
    
    // 1. Update maintenance_requests to NULL out user_id (preserves request history)
    const { error: maintenanceError } = await supabaseClient
      .from('maintenance_requests')
      .update({ user_id: null })
      .eq('user_id', userId);

    if (maintenanceError) {
      console.warn("Warning updating maintenance_requests:", maintenanceError);
    }
    console.log(`Nullified user_id in maintenance_requests for user ${userId}`);

    // 2. Update properties to NULL out user_id (preserves property data)
    const { error: propertiesError } = await supabaseClient
      .from('properties')
      .update({ user_id: null })
      .eq('user_id', userId);

    if (propertiesError) {
      console.warn("Warning updating properties:", propertiesError);
    }
    console.log(`Nullified user_id in properties for user ${userId}`);

    // 3. Delete from notifications
    const { error: notificationsError } = await supabaseClient
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (notificationsError) {
      console.warn("Warning deleting notifications:", notificationsError);
    }

    // 4. Delete from comments
    const { error: commentsError } = await supabaseClient
      .from('comments')
      .delete()
      .eq('user_id', userId);

    if (commentsError) {
      console.warn("Warning deleting comments:", commentsError);
    }

    // 5. Delete from temporary_sessions
    const { error: sessionsError } = await supabaseClient
      .from('temporary_sessions')
      .delete()
      .eq('user_id', userId);

    if (sessionsError) {
      console.warn("Warning deleting temporary_sessions:", sessionsError);
    }

    // 6. Delete from security_events
    const { error: securityError } = await supabaseClient
      .from('security_events')
      .delete()
      .eq('user_id', userId);

    if (securityError) {
      console.warn("Warning deleting security_events:", securityError);
    }

    // 7. Delete from contractors
    const { error: contractorsError } = await supabaseClient
      .from('contractors')
      .delete()
      .eq('user_id', userId);

    if (contractorsError) {
      console.warn("Warning deleting contractors:", contractorsError);
    }

    // 8. Delete from profiles
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
    
    // Update organizations created_by to NULL (preserves org data)
    const { error: orgError } = await supabaseClient
      .from('organizations')
      .update({ created_by: null })
      .eq('created_by', userId);
    
    if (orgError) {
      console.warn("Warning updating organizations:", orgError);
    }
    console.log(`Nullified created_by in organizations for user ${userId}`);
    
    // Now delete the auth user
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
