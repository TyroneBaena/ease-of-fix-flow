
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook to subscribe to real-time comments updates
 */
export function useRequestCommentsSubscription(requestId: string | undefined, onNewComment: () => void) {
  useEffect(() => {
    if (!requestId) return;
    
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
          console.log('New comment received:', payload);
          onNewComment();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, onNewComment]);
}
