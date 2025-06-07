
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook to subscribe to real-time comments updates
 */
export function useRequestCommentsSubscription(requestId: string | undefined, onNewComment: () => void) {
  const channelRef = useRef<any>(null);
  const currentRequestIdRef = useRef<string | undefined>();

  useEffect(() => {
    if (!requestId || requestId === currentRequestIdRef.current) return;
    
    // Clean up previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    currentRequestIdRef.current = requestId;
    
    const channel = supabase
      .channel(`comments-${requestId}`)
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
          // Only call onNewComment if we have a valid payload
          if (payload.new) {
            onNewComment();
          }
        }
      )
      .subscribe();
      
    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [requestId, onNewComment]);
}
