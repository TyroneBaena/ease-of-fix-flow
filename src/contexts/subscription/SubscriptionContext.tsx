import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedAuth } from "@/contexts/UnifiedAuthContext";

interface SubscriptionContextValue {
  subscribed: boolean | null;
  subscriptionTier: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  pauseAutoRefresh: () => void;
  resumeAutoRefresh: () => void;
  
  // Trial and property-based billing data
  isTrialActive: boolean | null;
  isCancelled: boolean | null;
  trialEndDate: string | null;
  daysRemaining: number | null;
  propertyCount: number | null;
  monthlyAmount: number | null;
  currency: string | null;
  hasPaymentMethod: boolean | null;
  
  // Trial management functions
  startTrial: () => Promise<{ success: boolean; error?: string }>;
  cancelTrial: (reason: string) => Promise<{ success: boolean; error?: string }>;
  reactivateSubscription: () => Promise<{ success: boolean; error?: string }>;
  calculateBilling: () => Promise<{ success: boolean; error?: string; billingData?: any }>;
  upgradeToPaid: () => Promise<{ success: boolean; error?: string }>;
  
  // Property count management
  refreshPropertyCount: () => Promise<void>;
  
  // Debug function
  debugDatabaseState: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, currentOrganization, isSessionReady } = useUnifiedAuth();
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefreshPaused, setAutoRefreshPaused] = useState(false);
  
  // Trial and billing state
  const [isTrialActive, setIsTrialActive] = useState<boolean | null>(null);
  const [isCancelled, setIsCancelled] = useState<boolean | null>(null);
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [propertyCount, setPropertyCount] = useState<number | null>(null);
  const [monthlyAmount, setMonthlyAmount] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);
  const [hasPaymentMethod, setHasPaymentMethod] = useState<boolean | null>(null);

  // CRITICAL: Track completion and prevent concurrent fetches/flashes
  const hasCompletedInitialLoadRef = React.useRef(false);
  const isFetchingRef = React.useRef(false);
  const fetchDebounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const clear = useCallback(() => {
    setSubscribed(null);
    setSubscriptionTier(null);
    setSubscriptionEnd(null);
    setIsTrialActive(null);
    setIsCancelled(null);
    setTrialEndDate(null);
    setDaysRemaining(null);
    setPropertyCount(null);
    setMonthlyAmount(null);
    setCurrency(null);
    setHasPaymentMethod(null);
  }, []);

  const refresh = useCallback(async () => {
    // CRITICAL: Wait for session to be ready before querying
    if (!isSessionReady) {
      console.log('🔄 v77.2 - SubscriptionContext - Waiting for session to be ready...');
      // v77.2: NEVER set loading when waiting for session
      return;
    }
    
    if (!currentUser?.id || !currentOrganization?.id) {
      setSubscribed(null);
      setSubscriptionTier(null);
      setSubscriptionEnd(null);
      setIsTrialActive(null);
      setIsCancelled(null);
      setTrialEndDate(null);
      setDaysRemaining(null);
      setPropertyCount(null);
      setMonthlyAmount(null);
      setCurrency(null);
      setHasPaymentMethod(null);
      setLoading(false);
      return;
    }
    
    // CRITICAL: Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('🔄 SubscriptionContext - Fetch already in progress, skipping');
      return;
    }

    try {
      isFetchingRef.current = true;
      // v77.2: CRITICAL - NEVER set loading after initial load
      if (!hasCompletedInitialLoadRef.current) {
        setLoading(true);
      } else {
        console.log('🔕 v77.2 - SubscriptionContext - SILENT REFRESH - Skipping loading state');
      }
      
      console.log('🔄 SubscriptionContext - Fetching for organization:', currentOrganization.id);
      
      const { data: row, error: fetchErr } = await supabase
        .from("subscribers")
        .select(`
          subscribed, 
          subscription_tier, 
          subscription_end,
          is_trial_active,
          is_cancelled,
          trial_end_date,
          active_properties_count,
          payment_method_id
        `)
        .eq("organization_id", currentOrganization.id)
        .maybeSingle();

      // Handle organizations without subscriber records
      if (!row && !fetchErr) {
        console.log("🟡 No subscription found for organization:", currentOrganization.name);
        // Set explicit values for organizations that haven't started a trial yet
        setSubscribed(false);
        setSubscriptionTier(null);
        setSubscriptionEnd(null);
        setIsTrialActive(false); // Explicitly false - trial not started yet
        setIsCancelled(false);
        setTrialEndDate(null);
        setPropertyCount(0);
        setHasPaymentMethod(false);
        return; // Exit early
      }
        
      if (fetchErr) {
        console.error("subscribers fetch error:", fetchErr);
        return;
      }
      
      setSubscribed((row as any)?.subscribed ?? false);
      setSubscriptionTier((row as any)?.subscription_tier ?? null);
      setSubscriptionEnd((row as any)?.subscription_end ?? null);
      setIsTrialActive((row as any)?.is_trial_active ?? false);
      setIsCancelled((row as any)?.is_cancelled ?? false);
      setTrialEndDate((row as any)?.trial_end_date ?? null);
      setPropertyCount((row as any)?.active_properties_count ?? 0);
      setHasPaymentMethod(!!((row as any)?.payment_method_id));
      
      // Debug logging
      console.log('🟢 Organization Subscription Status:', {
        organization_id: currentOrganization.id,
        organization_name: currentOrganization.name,
        payment_method_id: (row as any)?.payment_method_id,
        hasPaymentMethod: !!((row as any)?.payment_method_id),
        isTrialActive: (row as any)?.is_trial_active,
        subscribed: (row as any)?.subscribed,
        user_role: currentUser.role
      });
      
      // Debug logging for development
      if (row) {
        console.log("🟡 Organization subscription loaded:", {
          subscribed: (row as any)?.subscribed,
          isTrialActive: (row as any)?.is_trial_active,
          trialEndDate: (row as any)?.trial_end_date
        });
      }
      
      // Calculate days remaining based on trial_end_date
      // TRUST DATABASE: Only calculate if database says trial is active
      let calculatedDaysRemaining = null;
      
      if ((row as any)?.is_trial_active && (row as any)?.trial_end_date) {
        const endDate = new Date((row as any).trial_end_date);
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Only set days remaining if positive (trial hasn't expired)
        if (diffDays > 0) {
          calculatedDaysRemaining = diffDays;
        }
        
        console.log("🟡 Trial calculation:", {
          trialEndDate: (row as any).trial_end_date,
          isCancelled: (row as any).is_cancelled,
          isTrialActiveFromDB: (row as any).is_trial_active,
          daysRemaining: diffDays,
          calculatedDaysRemaining
        });
      }
      
      // Trust the database value for is_trial_active
      setDaysRemaining(calculatedDaysRemaining);
      
      // Calculate monthly amount based on property count
      const propCount = (row as any)?.active_properties_count || 0;
      setMonthlyAmount(propCount * 29);
      setCurrency('aud');
      
      // Debug: Also log what fields are available in the database
      console.log("🟡 Available fields in subscriber record:", Object.keys(row || {}));
      
    } catch (error) {
      console.error("Subscription refresh error:", error);
      // CRITICAL: Set safe defaults on any error
      setSubscribed(false);
      setSubscriptionTier(null);
      setSubscriptionEnd(null);
      setIsTrialActive(false);
      setIsCancelled(false);
      setTrialEndDate(null);
      setPropertyCount(0);
      setHasPaymentMethod(false);
      setDaysRemaining(null);
      setMonthlyAmount(0);
      setCurrency('aud');
    } finally {
      // CRITICAL: Only reset loading on first load, keep it false after
      if (!hasCompletedInitialLoadRef.current) {
        setLoading(false);
      }
      hasCompletedInitialLoadRef.current = true;
      isFetchingRef.current = false;
    }
  }, [currentUser?.id, currentOrganization?.id]);

  // Separate function to refresh property count specifically
  const refreshPropertyCount = useCallback(async () => {
    if (!currentOrganization?.id) return;

    try {
      // Directly query and update property count for organization
      const { data: row } = await supabase
        .from("subscribers")
        .select("active_properties_count")
        .eq("organization_id", currentOrganization.id)
        .maybeSingle();
      
      if (row) {
        setPropertyCount((row as any)?.active_properties_count ?? 0);
        setMonthlyAmount(((row as any)?.active_properties_count || 0) * 29);
      }
    } catch (error) {
      console.error("Property count refresh error:", error);
    }
  }, [currentOrganization?.id]);

  const startTrial = useCallback(async () => {
    if (!currentUser) {
      return { success: false, error: "User not authenticated" };
    }
    
    try {
      console.log("Starting trial subscription for user:", currentUser.id);
      console.log("Current user state:", { id: currentUser.id, email: currentUser.email });
      
      // Get current session to ensure we have a valid token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log("Session retrieval result:", { hasSession: !!session, sessionError });
      
      if (sessionError || !session) {
        console.error("Session error:", sessionError);
        return { success: false, error: "Authentication session invalid" };
      }
      
      console.log("Session found, calling create-trial-subscription function");
      
      // With verify_jwt = true, the authorization header is automatically included
      const { data, error } = await supabase.functions.invoke("create-trial-subscription", {
        body: { 
          email: currentUser.email 
        }
      });
      
      if (error) {
        console.error("Start trial error:", error);
        return { success: false, error: error.message };
      }
      
      console.log("Trial subscription started successfully:", data);
      // Refresh subscription data after starting trial
      await refresh();
      return { success: true };
    } catch (error) {
      console.error("Start trial exception:", error);
      return { success: false, error: "Failed to start trial" };
    }
  }, [currentUser?.id]);

  const cancelTrial = useCallback(async (reason: string) => {
    if (!currentUser) {
      return { success: false, error: "User not authenticated" };
    }
    
    try {
      console.log("🟡 SubscriptionContext: Starting trial cancellation for user:", currentUser.id);
      console.log("🟡 SubscriptionContext: Cancellation reason:", reason);
      
      // Get current session to ensure we have a valid token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error("🔴 SubscriptionContext: Session error:", sessionError);
        return { success: false, error: "Authentication session invalid" };
      }
      
      console.log("🟡 SubscriptionContext: Session found, calling cancel-trial-subscription function");
      const { data, error } = await supabase.functions.invoke("cancel-trial-subscription", {
        body: { 
          reason 
        }
      });
      
      console.log("🟡 SubscriptionContext: Edge function response - data:", data, "error:", error);
      
      if (error) {
        console.error("🔴 SubscriptionContext: Cancel trial error:", error);
        return { success: false, error: error.message };
      }
      
      console.log("🟢 SubscriptionContext: Trial cancellation successful:", data);
      // Refresh subscription data after cancellation
      await refresh();
      return { success: true };
    } catch (error) {
      console.error("🔴 SubscriptionContext: Cancel trial exception:", error);
      return { success: false, error: "Failed to cancel trial" };
    }
  }, [currentUser?.id]);

  const reactivateSubscription = useCallback(async () => {
    if (!currentUser) {
      return { success: false, error: "User not authenticated" };
    }
    
    try {
      console.log("Starting subscription reactivation for user:", currentUser.id);
      
      // Get current session to ensure we have a valid token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error("Session error:", sessionError);
        return { success: false, error: "Authentication session invalid" };
      }
      
      console.log("Session found, calling reactivate-subscription function");
      const { data, error } = await supabase.functions.invoke("reactivate-subscription");
      
      if (error) {
        console.error("Reactivate subscription error:", error);
        return { success: false, error: error.message };
      }
      
      console.log("Subscription reactivated successfully:", data);
      // Refresh subscription data after reactivation
      await refresh();
      return { success: true };
    } catch (error) {
      console.error("Reactivate subscription exception:", error);
      return { success: false, error: "Failed to reactivate subscription" };
    }
  }, [currentUser?.id]);

  const calculateBilling = useCallback(async () => {
    if (!currentUser) {
      return { success: false, error: "User not authenticated" };
    }
    
    try {
      console.log("Starting billing calculation for user:", currentUser.id);
      
      // Get current session to ensure we have a valid token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error("Session error:", sessionError);
        return { success: false, error: "Authentication session invalid" };
      }
      
      console.log("Session found, calling edge function with auth token");
      const { data, error } = await supabase.functions.invoke("calculate-property-billing", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      
      if (error) {
        console.error("Calculate billing error:", error);
        return { success: false, error: error.message };
      }
      
      console.log("Billing calculation successful:", data);
      // Refresh subscription data after calculating billing
      await refresh();
      return { success: true, billingData: data };
    } catch (error) {
      console.error("Calculate billing exception:", error);
      return { success: false, error: "Failed to calculate billing" };
    }
  }, [currentUser?.id]);

  const upgradeToPaid = useCallback(async () => {
    if (!currentUser) {
      return { success: false, error: "User not authenticated" };
    }
    
    try {
      // First refresh property count to ensure we have latest data
      await refreshPropertyCount();
      
      console.log("Starting upgrade to paid for user:", currentUser.id);
      
      // Get current session to ensure we have a valid token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error("Session error:", sessionError);
        return { success: false, error: "Authentication session invalid" };
      }
      
      console.log("Session found, calling upgrade-trial-to-paid function");
      // End trial and create paid subscription
      const { data, error } = await supabase.functions.invoke("upgrade-trial-to-paid");
      
      if (error) {
        console.error("Upgrade to paid error:", error);
        return { success: false, error: error.message };
      }
      
      console.log("Upgrade to paid successful:", data);
      // Refresh subscription data after upgrade
      await refresh();
      return { success: true };
    } catch (error) {
      console.error("Upgrade to paid exception:", error);
      return { success: false, error: "Failed to upgrade to paid subscription" };
    }
  }, [currentUser?.id]);

  // Track previous values to prevent unnecessary refreshes on tab revisit
  const prevUserIdRef = React.useRef<string | undefined>();
  const prevOrgIdRef = React.useRef<string | undefined>();
  const prevIsSessionReadyRef = React.useRef<boolean>(false);
  
  useEffect(() => {
    console.log('SubscriptionContext - useEffect triggered');
    
    // Clear any pending debounce timers
    if (fetchDebounceTimerRef.current) {
      clearTimeout(fetchDebounceTimerRef.current);
    }
    
    // CRITICAL: Wait for session to be ready before refreshing
    if (!isSessionReady) {
      console.log('SubscriptionContext - Waiting for session to be ready');
      setLoading(true);
      return;
    }
    
    // CRITICAL FIX: Only refresh if user or org IDs ACTUALLY changed OR session just became ready
    // This prevents loading cascade when tab becomes visible
    const userIdChanged = prevUserIdRef.current !== currentUser?.id;
    const orgIdChanged = prevOrgIdRef.current !== currentOrganization?.id;
    const sessionReadyChanged = prevIsSessionReadyRef.current !== isSessionReady;
    
    console.log('SubscriptionContext - Checking for changes:', {
      userIdChanged,
      orgIdChanged,
      sessionReadyChanged,
      currentUserId: currentUser?.id,
      currentOrgId: currentOrganization?.id,
      isSessionReady
    });
    
    if (!currentUser?.id || !currentOrganization?.id) {
      // Clear all subscription data when no user/org
      clear();
      setLoading(false);
      prevUserIdRef.current = undefined;
      prevOrgIdRef.current = undefined;
      prevIsSessionReadyRef.current = false;
      hasCompletedInitialLoadRef.current = true;
      isFetchingRef.current = false;
      return;
    }
    
    if (userIdChanged || orgIdChanged || sessionReadyChanged) {
      console.log('SubscriptionContext - IDs or session ready changed, debouncing refresh');
      prevUserIdRef.current = currentUser.id;
      prevOrgIdRef.current = currentOrganization.id;
      prevIsSessionReadyRef.current = isSessionReady;
      
      // CRITICAL: Debounce rapid tab switches (300ms delay)
      fetchDebounceTimerRef.current = setTimeout(() => {
        refresh();
      }, 300);
    } else {
      // User/org exist but haven't changed - don't refresh, don't show loading
      console.log('SubscriptionContext - No changes detected, keeping current state');
    }
    
    return () => {
      if (fetchDebounceTimerRef.current) {
        clearTimeout(fetchDebounceTimerRef.current);
      }
    };
    // We intentionally exclude refresh from deps to avoid re-creating effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentOrganization?.id, isSessionReady]);

  // Pause/resume functions for auto-refresh
  const pauseAutoRefresh = useCallback(() => {
    console.log('[SubscriptionContext] Auto-refresh paused');
    setAutoRefreshPaused(true);
  }, []);

  const resumeAutoRefresh = useCallback(() => {
    console.log('[SubscriptionContext] Auto-refresh resumed');
    setAutoRefreshPaused(false);
  }, []);

  // Auto-refresh removed - use real-time subscriptions or manual refresh instead
  // The continuous polling was causing unnecessary re-renders

  const debugDatabaseState = useCallback(async () => {
    if (!currentOrganization?.id) {
      console.log("🔴 No current organization");
      return;
    }
    
    try {
      const { data: row, error } = await supabase
        .from("subscribers")
        .select("*")
        .eq("organization_id", currentOrganization.id)
        .maybeSingle();
        
      console.log("🟡 Full organization subscription record:", row);
      console.log("🟡 Error (if any):", error);
    } catch (error) {
      console.error("🔴 Debug query error:", error);
    }
  }, [currentOrganization]);

  const value: SubscriptionContextValue = useMemo(() => ({
    subscribed,
    subscriptionTier,
    subscriptionEnd,
    // CRITICAL: Override loading to false after initial load completes
    loading: hasCompletedInitialLoadRef.current ? false : loading,
    refresh,
    pauseAutoRefresh,
    resumeAutoRefresh,
    
    // Trial and property-based billing data
    isTrialActive,
    isCancelled,
    trialEndDate,
    daysRemaining,
    propertyCount,
    monthlyAmount,
    currency,
    hasPaymentMethod,
    
    // Trial management functions
    startTrial,
    cancelTrial,
    reactivateSubscription,
    calculateBilling,
    upgradeToPaid,
    
    // Property count management
    refreshPropertyCount,
    
    // Debug function
    debugDatabaseState,
  }), [
    subscribed, 
    subscriptionTier, 
    subscriptionEnd, 
    loading,
    refresh,
    pauseAutoRefresh,
    resumeAutoRefresh,
    isTrialActive,
    isCancelled,
    trialEndDate,
    daysRemaining,
    propertyCount,
    monthlyAmount,
    currency,
    hasPaymentMethod,
    startTrial,
    cancelTrial,
    reactivateSubscription,
    calculateBilling,
    upgradeToPaid,
    refreshPropertyCount,
    debugDatabaseState
  ]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextValue => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};