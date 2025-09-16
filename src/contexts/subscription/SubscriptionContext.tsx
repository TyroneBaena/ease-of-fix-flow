import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UnifiedAuthContext";

interface SubscriptionContextValue {
  subscribed: boolean | null;
  subscriptionTier: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useUserContext();
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const clear = () => {
    setSubscribed(null);
    setSubscriptionTier(null);
    setSubscriptionEnd(null);
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
      } else {
        const { data: row, error: fetchErr } = await supabase
          .from("subscribers")
          .select("subscribed, subscription_tier, subscription_end")
          .eq("user_id", currentUser.id)
          .maybeSingle();
        if (fetchErr) {
          console.error("subscribers fetch error:", fetchErr);
        }
        setSubscribed((row as any)?.subscribed ?? null);
        setSubscriptionTier((row as any)?.subscription_tier ?? null);
        setSubscriptionEnd((row as any)?.subscription_end ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

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
  }), [subscribed, subscriptionTier, subscriptionEnd, loading, refresh]);

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
