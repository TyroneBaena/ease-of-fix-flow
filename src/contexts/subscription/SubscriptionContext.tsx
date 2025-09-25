import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UnifiedAuthContext";

interface SubscriptionContextValue {
  subscribed: boolean | null;
  subscriptionTier: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  
  // New trial and property-based billing fields
  isTrialActive: boolean | null;
  trialEndDate: string | null;
  daysRemaining: number | null;
  propertyCount: number | null;
  monthlyAmount: number | null;
  currency: string | null;
  
  // Trial management functions
  startTrial: () => Promise<{ success: boolean; error?: string }>;
  cancelTrial: () => Promise<{ success: boolean; error?: string }>;
  reactivateSubscription: () => Promise<{ success: boolean; error?: string }>;
  calculateBilling: () => Promise<{ success: boolean; error?: string; billingData?: any }>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useUserContext();
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // New trial and property-based billing state
  const [isTrialActive, setIsTrialActive] = useState<boolean | null>(null);
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [propertyCount, setPropertyCount] = useState<number | null>(null);
  const [monthlyAmount, setMonthlyAmount] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string | null>(null);

  const clear = () => {
    setSubscribed(null);
    setSubscriptionTier(null);
    setSubscriptionEnd(null);
    setIsTrialActive(null);
    setTrialEndDate(null);
    setDaysRemaining(null);
    setPropertyCount(null);
    setMonthlyAmount(null);
    setCurrency(null);
  };

  const refresh = useCallback(async () => {
    if (!currentUser) {
      clear();
      return;
    }
    setLoading(true);
    try {
      // First, ask Stripe via edge function and upsert the DB
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) {
        console.error("check-subscription error:", error);
      }

      // Prefer the function's response when available, otherwise read from DB
      if (data && typeof (data as any).subscribed !== "undefined") {
        const resp = data as any;
        setSubscribed(!!resp.subscribed);
        setSubscriptionTier(resp.subscription_tier ?? null);
        setSubscriptionEnd(resp.subscription_end ?? null);
        
        // Set trial and property data if available
        setIsTrialActive(resp.is_trial_active ?? null);
        setTrialEndDate(resp.trial_end_date ?? null);
        setDaysRemaining(resp.days_remaining ?? null);
        setPropertyCount(resp.property_count ?? null);
        setMonthlyAmount(resp.monthly_amount ?? null);
        setCurrency(resp.currency ?? null);
      } else {
        const { data: row, error: fetchErr } = await supabase
          .from("subscribers")
          .select(`
            subscribed, 
            subscription_tier, 
            subscription_end,
            is_trial_active,
            trial_end_date,
            active_properties_count
          `)
          .eq("user_id", currentUser.id)
          .maybeSingle();
        if (fetchErr) {
          console.error("subscribers fetch error:", fetchErr);
        }
        setSubscribed((row as any)?.subscribed ?? null);
        setSubscriptionTier((row as any)?.subscription_tier ?? null);
        setSubscriptionEnd((row as any)?.subscription_end ?? null);
        setIsTrialActive((row as any)?.is_trial_active ?? null);
        setTrialEndDate((row as any)?.trial_end_date ?? null);
        setPropertyCount((row as any)?.active_properties_count ?? null);
        
        // Calculate days remaining if trial is active
        if ((row as any)?.trial_end_date && (row as any)?.is_trial_active) {
          const endDate = new Date((row as any).trial_end_date);
          const now = new Date();
          const diffTime = endDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          setDaysRemaining(diffDays > 0 ? diffDays : 0);
        } else {
          setDaysRemaining(null);
        }
        
        // Calculate monthly amount
        const propCount = (row as any)?.active_properties_count ?? 0;
        setMonthlyAmount(propCount * 29);
        setCurrency('aud');
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Trial management functions
  const startTrial = useCallback(async () => {
    if (!currentUser) {
      return { success: false, error: "User not authenticated" };
    }
    
    try {
      const { data, error } = await supabase.functions.invoke("create-trial-subscription", {
        body: { user_id: currentUser.id, email: currentUser.email }
      });
      
      if (error) {
        console.error("Start trial error:", error);
        return { success: false, error: error.message };
      }
      
      // Refresh subscription data after starting trial
      await refresh();
      return { success: true };
    } catch (error) {
      console.error("Start trial exception:", error);
      return { success: false, error: "Failed to start trial" };
    }
  }, [currentUser, refresh]);

  const cancelTrial = useCallback(async () => {
    if (!currentUser) {
      return { success: false, error: "User not authenticated" };
    }
    
    try {
      const { data, error } = await supabase.functions.invoke("cancel-trial-subscription");
      
      if (error) {
        console.error("Cancel trial error:", error);
        return { success: false, error: error.message };
      }
      
      // Refresh subscription data after canceling trial
      await refresh();
      return { success: true };
    } catch (error) {
      console.error("Cancel trial exception:", error);
      return { success: false, error: "Failed to cancel trial" };
    }
  }, [currentUser, refresh]);

  const reactivateSubscription = useCallback(async () => {
    if (!currentUser) {
      return { success: false, error: "User not authenticated" };
    }
    
    try {
      const { data, error } = await supabase.functions.invoke("reactivate-subscription");
      
      if (error) {
        console.error("Reactivate subscription error:", error);
        return { success: false, error: error.message };
      }
      
      // Refresh subscription data after reactivating
      await refresh();
      return { success: true };
    } catch (error) {
      console.error("Reactivate subscription exception:", error);
      return { success: false, error: "Failed to reactivate subscription" };
    }
  }, [currentUser, refresh]);

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
      
      console.log("Session found, calling edge function");
      const { data, error } = await supabase.functions.invoke("calculate-property-billing");
      
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
  }, [currentUser, refresh]);

  useEffect(() => {
    // When auth user changes, refresh subscription state
    if (currentUser?.id) {
      refresh();
    } else {
      clear();
    }
    // We intentionally exclude refresh from deps to avoid re-creating effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const value: SubscriptionContextValue = useMemo(() => ({
    subscribed,
    subscriptionTier,
    subscriptionEnd,
    loading,
    refresh,
    
    // Trial and property-based billing data
    isTrialActive,
    trialEndDate,
    daysRemaining,
    propertyCount,
    monthlyAmount,
    currency,
    
    // Trial management functions
    startTrial,
    cancelTrial,
    reactivateSubscription,
    calculateBilling,
  }), [
    subscribed, 
    subscriptionTier, 
    subscriptionEnd, 
    loading, 
    refresh,
    isTrialActive,
    trialEndDate,
    daysRemaining,
    propertyCount,
    monthlyAmount,
    currency,
    startTrial,
    cancelTrial,
    reactivateSubscription,
    calculateBilling
  ]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within a SubscriptionProvider");
  return ctx;
};
