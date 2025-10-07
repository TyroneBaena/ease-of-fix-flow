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
  
  // Track the API call promise to prevent concurrent calls
  const initializePromiseRef = useRef<Promise<void> | null>(null);

  const initialize = useCallback(async () => {
    // If already initialized or in progress, return the existing promise
    if (initializedRef.current) {
      console.log('[PaymentSetup] Already initialized, skipping');
      return;
    }
    
    if (initializePromiseRef.current) {
      console.log('[PaymentSetup] Initialization already in progress, waiting for existing call');
      return initializePromiseRef.current;
    }

    // Create and store the initialization promise
    const initPromise = (async () => {
      console.log('[PaymentSetup] Starting initialization...');
      initializingRef.current = true;
      setState('initializing');
      setError(null); // Clear any previous errors

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
          console.error('[PaymentSetup] API error:', functionError);
          throw functionError;
        }

        if (!data?.client_secret) {
          console.error('[PaymentSetup] No client secret in response:', data);
          throw new Error('Failed to initialize payment setup');
        }

        console.log('[PaymentSetup] Successfully initialized with client secret');
        setClientSecret(data.client_secret);
        setState('ready');
        initializedRef.current = true;
      } catch (err) {
        console.error('[PaymentSetup] Initialization error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize payment setup';
        setError(errorMessage);
        setState('error');
        initializingRef.current = false;
        initializedRef.current = false;
      } finally {
        // Clear the promise reference
        initializePromiseRef.current = null;
        // Only reset initializing flag if not successfully initialized
        if (!initializedRef.current) {
          initializingRef.current = false;
        }
      }
    })();
    
    initializePromiseRef.current = initPromise;
    return initPromise;
  }, []); // No dependencies - guards are handled by refs

  const reset = useCallback(() => {
    console.log('[PaymentSetup] Resetting state');
    // Clear promise first to prevent any pending operations
    initializePromiseRef.current = null;
    initializingRef.current = false;
    initializedRef.current = false;
    
    // Then reset UI state
    setState('idle');
    setClientSecret(null);
    setError(null);
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
