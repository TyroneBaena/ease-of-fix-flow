
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook to subscribe to real-time comment updates for a specific request
 * Handles tab visibility changes and reconnection seamlessly
 */
export function useRequestCommentsSubscription(requestId: string | undefined, onNewComment: () => void) {
  // Use a ref to track the current requestId and prevent double subscriptions
  const currentRequestIdRef = useRef<string | undefined>(requestId);
  const channelRef = useRef<any>(null);
  const isSubscribingRef = useRef(false);

  useEffect(() => {
    // Skip if no requestId or the requestId hasn't changed
    if (!requestId || requestId === currentRequestIdRef.current) return;
    
    // Prevent concurrent subscriptions
    if (isSubscribingRef.current) return;
    
    isSubscribingRef.current = true;
    
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
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
        isSubscribingRef.current = false;
      });
    
    // Save the channel reference
    channelRef.current = channel;
    
    // Handle visibility changes for seamless reconnection
    const handleVisibilityChange = () => {
      if (!document.hidden && channelRef.current) {
        // Tab became visible - ensure subscription is still active
        const channelState = channelRef.current.state;
        if (channelState !== 'joined') {
          console.log('Real-time channel not active, reconnecting...');
          // Supabase automatically handles reconnection
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup the subscription when component unmounts or requestId changes
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      isSubscribingRef.current = false;
    };
  }, [requestId, onNewComment]);
  
  return null;
}
