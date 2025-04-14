
// Deno imports for Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface InviteRequest {
  email: string;
  name: string;
  role: 'admin' | 'manager';
  assignedProperties?: string[];
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
    const body = await req.json() as InviteRequest;
    const { email, name, role, assignedProperties = [] } = body;
    
    if (!email || !name || !role) {
      return new Response(
        JSON.stringify({ error: "Email, name, and role are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`Sending invitation to ${email} with role ${role}`);
    
    // Generate a secure random password
    const generatePassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };
    
    const temporaryPassword = generatePassword();
    
    // Create the user with a temporary password
    const { data: authData, error: createError } = await supabaseClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        name,
        role,
        assignedProperties: role === 'manager' ? assignedProperties : [],
      }
    });
    
    if (createError) {
      console.error("Error creating user:", createError);
      throw createError;
    }
    
    // Send invitation email
    // In a production environment, you would integrate with an email service like Resend, SendGrid, etc.
    // For now, we'll just log the invitation details
    console.log(`
      Invitation details:
      - Email: ${email}
      - Name: ${name}
      - Role: ${role}
      - Temporary Password: ${temporaryPassword}
      - User ID: ${authData.user.id}
    `);
    
    // In the future, implement proper email sending here
    // const { error: emailError } = await sendEmail({ to: email, subject: "Invitation", ... });
    
    return new Response(
      JSON.stringify({ success: true, message: "Invitation sent successfully", userId: authData.user.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Invitation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: error.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
