import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UnifiedAuthContext";

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
  const { currentUser } = useUserContext();
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
  }, []);

  const refresh = useCallback(async () => {
    if (!currentUser?.id) {
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
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Directly query the database to avoid function caching issues
      let { data: row, error: fetchErr } = await supabase
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
        .eq("user_id", currentUser.id)
        .maybeSingle();

      // Handle new users without subscriber records (haven't started trial yet)
      if (!row && !fetchErr) {
        console.log("🟡 No subscriber record found for user:", currentUser.email);
        // Set explicit values for users who haven't started a trial yet
        setSubscribed(false);
        setSubscriptionTier(null);
        setSubscriptionEnd(null);
        setIsTrialActive(false); // Explicitly false - trial not started yet
        setIsCancelled(false);
        setTrialEndDate(null);
        setPropertyCount(0);
        return; // Exit early to avoid confusion
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
      
      // Debug logging for development
      if (row) {
        console.log("🟡 Subscription state loaded:", {
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
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  // Separate function to refresh property count specifically
  const refreshPropertyCount = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      // Directly query and update property count
      const { data: row } = await supabase
        .from("subscribers")
        .select("active_properties_count")
        .eq("user_id", currentUser.id)
        .maybeSingle();
      
      if (row) {
        setPropertyCount((row as any)?.active_properties_count ?? 0);
        setMonthlyAmount(((row as any)?.active_properties_count || 0) * 29);
      }
    } catch (error) {
      console.error("Property count refresh error:", error);
    }
  }, [currentUser?.id]);

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

  useEffect(() => {
    // When auth user changes, refresh subscription state
    if (currentUser?.id) {
      refresh();
    } else {
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
      setLoading(false);
    }
    // We intentionally exclude refresh from deps to avoid re-creating effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

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
    if (!currentUser?.id) {
      console.log("🔴 No current user");
      return;
    }
    
    try {
      const { data: row, error } = await supabase
        .from("subscribers")
        .select("*")
        .eq("user_id", currentUser.id)
        .maybeSingle();
        
      console.log("🟡 Full database record:", row);
      console.log("🟡 Error (if any):", error);
    } catch (error) {
      console.error("🔴 Debug query error:", error);
    }
  }, [currentUser]);

  const value: SubscriptionContextValue = useMemo(() => ({
    subscribed,
    subscriptionTier,
    subscriptionEnd,
    loading,
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