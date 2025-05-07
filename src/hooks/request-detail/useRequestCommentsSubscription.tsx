
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook to subscribe to real-time comment updates for a specific request
 */
export function useRequestCommentsSubscription(requestId: string | undefined, onNewComment: () => void) {
  useEffect(() => {
    if (!requestId) return;
    
    // Create a Supabase real-time subscription for new comments
    const channel = supabase
      .channel('comments-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `request_id=eq.${requestId}`
        },
        (payload) => {
          console.log('New comment received via real-time:', payload);
          if (payload.new && onNewComment) {
            onNewComment();
          }
        }
      )
      .subscribe();
    
    // Cleanup the subscription when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, onNewComment]);
  
  return null;
}
