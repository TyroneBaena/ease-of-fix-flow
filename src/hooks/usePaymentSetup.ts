import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

type SetupState = 'idle' | 'initializing' | 'ready' | 'processing' | 'complete' | 'error';

interface UsePaymentSetupReturn {
  state: SetupState;
  clientSecret: string | null;
  error: string | null;
  initialize: () => Promise<void>;
  reset: () => void;
  setComplete: () => void;
}

export const usePaymentSetup = (): UsePaymentSetupReturn => {
  const [state, setState] = useState<SetupState>('idle');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Track if initialization is in progress to prevent duplicate calls
  const initializingRef = useRef(false);
  const initializedRef = useRef(false);

  const initialize = useCallback(async () => {
    // Prevent duplicate initialization attempts using refs only
    if (initializingRef.current || initializedRef.current) {
      console.log('[PaymentSetup] Skipping initialization - already initialized or in progress', {
        initializing: initializingRef.current,
        initialized: initializedRef.current
      });
      return;
    }

    console.log('[PaymentSetup] Starting initialization...');
    initializingRef.current = true;
    setState('initializing');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Please log in to continue');
      }

      console.log('[PaymentSetup] Calling add-payment-method API...');
      const { data, error: functionError } = await supabase.functions.invoke(
        'add-payment-method',
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (functionError) {
        throw functionError;
      }

      if (!data?.client_secret) {
        throw new Error('Failed to initialize payment setup');
      }

      console.log('[PaymentSetup] Successfully initialized with client secret');
      setClientSecret(data.client_secret);
      setState('ready');
      initializedRef.current = true;
    } catch (err) {
      console.error('[PaymentSetup] Initialization error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize payment setup');
      setState('error');
      initializingRef.current = false;
    } finally {
      // Only reset if not already initialized successfully
      if (!initializedRef.current) {
        initializingRef.current = false;
      }
    }
  }, []); // No dependencies - guards are handled by refs

  const reset = useCallback(() => {
    console.log('[PaymentSetup] Resetting state');
    setState('idle');
    setClientSecret(null);
    setError(null);
    initializingRef.current = false;
    initializedRef.current = false;
  }, []);

  const setComplete = useCallback(() => {
    setState('complete');
  }, []);

  return {
    state,
    clientSecret,
    error,
    initialize,
    reset,
    setComplete,
  };
};
