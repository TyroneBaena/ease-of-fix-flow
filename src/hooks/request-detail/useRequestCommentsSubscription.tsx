
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook to subscribe to real-time comment updates for a specific request
 */
export function useRequestCommentsSubscription(requestId: string | undefined, onNewComment: () => void) {
  // Use a ref to track the current requestId and prevent double subscriptions
  const currentRequestIdRef = useRef<string | undefined>(requestId);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // Skip if no requestId or the requestId hasn't changed
    if (!requestId || requestId === currentRequestIdRef.current) return;
    
    // Update the current requestId
    currentRequestIdRef.current = requestId;
    
    // Clean up previous subscription if it exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    // Create a Supabase real-time subscription for new comments
    const channel = supabase
      .channel(`comments-${requestId}`) // Use unique channel name per request
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
    
    // Save the channel reference
    channelRef.current = channel;
    
    // Cleanup the subscription when component unmounts or requestId changes
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [requestId, onNewComment]);
  
  return null;
}
