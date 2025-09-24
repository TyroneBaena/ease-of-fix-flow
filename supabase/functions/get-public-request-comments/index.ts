import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    const requestId = url.searchParams.get('requestId');
    
    console.log('📝 [GET-PUBLIC-REQUEST-COMMENTS] Request ID:', requestId);

    if (!requestId) {
      console.log('❌ [GET-PUBLIC-REQUEST-COMMENTS] Missing requestId parameter');
      return new Response(
        JSON.stringify({ error: 'Request ID is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('🔍 [GET-PUBLIC-REQUEST-COMMENTS] Starting comments fetch...');

    // Initialize Supabase client with service key for RLS bypass
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('🔗 [GET-PUBLIC-REQUEST-COMMENTS] Supabase client initialized');

    // Fetch comments for the request
    console.log('📊 [GET-PUBLIC-REQUEST-COMMENTS] Fetching comments...');
    const { data: comments, error } = await supabase
      .from('comments')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ [GET-PUBLIC-REQUEST-COMMENTS] Error fetching comments:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch comments' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('✅ [GET-PUBLIC-REQUEST-COMMENTS] Comments found:', comments?.length || 0);

    // Format comments for frontend consumption
    const formattedComments = (comments || []).map(comment => ({
      id: comment.id,
      user: comment.user_name || 'Unknown User',
      role: comment.user_role || 'User',
      text: comment.text || '',
      timestamp: formatTimestamp(comment.created_at),
      avatar: null // No avatar in public view
    }));

    console.log('📦 [GET-PUBLIC-REQUEST-COMMENTS] Returning response');
    return new Response(
      JSON.stringify({ 
        comments: formattedComments,
        count: formattedComments.length 
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('💥 [GET-PUBLIC-REQUEST-COMMENTS] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }), 
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
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString();
    }
  } catch (error) {
    return 'Unknown time';
  }
}