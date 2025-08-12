
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";

interface SubscriberRow {
  id: string;
  email: string;
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  stripe_customer_id: string | null;
  updated_at: string;
}

const Billing: React.FC = () => {
  const { currentUser } = useUserContext();
  const [loading, setLoading] = useState(false);
  const [sub, setSub] = useState<SubscriberRow | null>(null);

  const load = async () => {
    if (!currentUser) return;
    const { data, error } = await supabase
      .from("subscribers")
      .select("*")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (error) {
      console.error(error);
      toast.error("Failed to load subscription info");
      return;
    }
    setSub((data as unknown as SubscriberRow) || null);
  };

  useEffect(() => {
    load();
  }, [currentUser]);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("check-subscription");
    setLoading(false);
    if (error) {
      console.error(error);
      toast.error("Failed to refresh subscription");
    } else {
      toast.success(data?.subscribed ? "Subscription active" : "No active subscription");
      await load();
    }
  };

  const openPortal = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("customer-portal");
    setLoading(false);
    if (error) {
      console.error(error);
      toast.error("Failed to open customer portal");
      return;
    }
    const url = (data as any)?.url;
    if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="min-h-screen">
      <section className="py-10">
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription and payment details.
          </p>

          <div className="mt-6 rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Subscription status</div>
                <div className="text-sm text-muted-foreground">
                  {sub
                    ? sub.subscribed
                      ? `Active${sub.subscription_tier ? ` — ${sub.subscription_tier}` : ""}${
                          sub.subscription_end ? ` (renews/ends ${new Date(sub.subscription_end).toLocaleDateString()})` : ""
                        }`
                      : "No active subscription"
                    : "Not available"}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={refresh} disabled={loading}>
                  {loading ? "Refreshing..." : "Refresh status"}
                </Button>
                <Button onClick={openPortal} variant="secondary" disabled={loading}>
                  Open Customer Portal
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 text-sm text-muted-foreground">
            Need help? Contact support any time.
          </div>
        </div>
      </section>
    </div>
  );
};

export default Billing;
