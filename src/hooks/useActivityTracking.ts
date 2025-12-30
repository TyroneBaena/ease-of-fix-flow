import { useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';

type EventType = 'page_view' | 'feature_used' | 'action';

interface TrackingOptions {
  metadata?: Record<string, any>;
}

export const useActivityTracking = () => {
  const { currentUser } = useSimpleAuth();
  const lastTrackedRef = useRef<Map<string, number>>(new Map());
  const DEBOUNCE_MS = 5000; // 5 second debounce for same events

  const shouldTrack = useCallback((eventType: EventType, eventName: string): boolean => {
    const key = `${eventType}:${eventName}`;
    const now = Date.now();
    const lastTracked = lastTrackedRef.current.get(key);
    
    if (lastTracked && now - lastTracked < DEBOUNCE_MS) {
      return false;
    }
    
    lastTrackedRef.current.set(key, now);
    return true;
  }, []);

  const trackEvent = useCallback(async (
    eventType: EventType,
    eventName: string,
    options?: TrackingOptions
  ) => {
    if (!currentUser?.id || !currentUser?.organization_id) {
      return;
    }

    if (!shouldTrack(eventType, eventName)) {
      return;
    }

    try {
      await supabase.from('app_activity_logs').insert({
        user_id: currentUser.id,
        user_name: currentUser.name || 'Unknown',
        user_email: currentUser.email || '',
        organization_id: currentUser.organization_id,
        event_type: eventType,
        event_name: eventName,
        metadata: options?.metadata || {}
      });
    } catch (error) {
      // Non-blocking - don't log errors to avoid spam
      console.debug('Activity tracking failed:', error);
    }
  }, [currentUser?.id, currentUser?.organization_id, currentUser?.name, currentUser?.email, shouldTrack]);

  const trackPageView = useCallback((pageName: string, metadata?: Record<string, any>) => {
    trackEvent('page_view', pageName, { metadata });
  }, [trackEvent]);

  const trackFeatureUsed = useCallback((featureName: string, metadata?: Record<string, any>) => {
    trackEvent('feature_used', featureName, { metadata });
  }, [trackEvent]);

  const trackAction = useCallback((actionName: string, metadata?: Record<string, any>) => {
    trackEvent('action', actionName, { metadata });
  }, [trackEvent]);

  return {
    trackPageView,
    trackFeatureUsed,
    trackAction
  };
};
