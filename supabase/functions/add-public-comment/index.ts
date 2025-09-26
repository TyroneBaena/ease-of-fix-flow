import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }), 
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { requestId, text, userName, userRole } = await req.json();
    
    console.log('📝 [ADD-PUBLIC-COMMENT] Adding comment for request:', requestId);
    console.log('📝 [ADD-PUBLIC-COMMENT] Comment text length:', text?.length);

    // Input validation
    if (!requestId || !text || !userName) {
      console.log('❌ [ADD-PUBLIC-COMMENT] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Request ID, text, and user name are required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate text length
    if (text.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Comment text must be less than 2000 characters' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate user name length
    if (userName.length > 100) {
      return new Response(
        JSON.stringify({ error: 'User name must be less than 100 characters' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🔍 [ADD-PUBLIC-COMMENT] Starting comment addition...');

    // Initialize Supabase client with service key for RLS bypass
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('🔗 [ADD-PUBLIC-COMMENT] Supabase client initialized');

    // First, get the request to verify it exists and get organization_id
    const { data: request, error: requestError } = await supabase
      .from('maintenance_requests')
      .select('id, organization_id, title')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      console.error('❌ [ADD-PUBLIC-COMMENT] Request not found:', requestError);
      return new Response(
        JSON.stringify({ error: 'Maintenance request not found' }), 
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ [ADD-PUBLIC-COMMENT] Request found:', request.title);

    // Create a temporary user ID for public comments (could be based on session or IP)
    const publicUserId = '00000000-0000-0000-0000-000000000000'; // Reserved UUID for public users

    // Insert the comment
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .insert({
        request_id: requestId,
        user_id: publicUserId,
        text: text.trim(),
        user_name: userName.trim(),
        user_role: userRole || 'Public User',
        organization_id: request.organization_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (commentError) {
      console.error('❌ [ADD-PUBLIC-COMMENT] Error creating comment:', commentError);
      return new Response(
        JSON.stringify({ error: 'Failed to add comment', details: commentError.message }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ [ADD-PUBLIC-COMMENT] Comment created successfully:', comment.id);

    // Format the comment for frontend consumption
    const formattedComment = {
      id: comment.id,
      user: comment.user_name,
      role: comment.user_role,
      text: comment.text,
      timestamp: formatTimestamp(comment.created_at),
      avatar: null
    };

    console.log('📦 [ADD-PUBLIC-COMMENT] Returning response');
    return new Response(
      JSON.stringify({ 
        success: true,
        comment: formattedComment,
        message: 'Comment added successfully'
      }), 
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 [ADD-PUBLIC-COMMENT] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (error as Error).message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  } catch (error) {
    return 'Unknown time';
  }
}