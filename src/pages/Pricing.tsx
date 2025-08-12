
import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UserContext";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

type Interval = "month" | "year";
type Plan = "starter" | "pro";

const Pricing: React.FC = () => {
  const [interval, setInterval] = useState<Interval>("month");
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useUserContext();

  const checkoutStatus = search.get("checkout");
  useMemo(() => {
    if (checkoutStatus === "success") {
      toast.success("Checkout complete. Updating subscription status...");
      supabase.functions.invoke("check-subscription").then(({ data, error }) => {
        if (error) {
          console.error(error);
          toast.error("Could not refresh subscription status.");
        } else {
          if (data?.subscribed) {
            toast.success("Trial activated! Welcome aboard.");
          } else {
            toast.info("No active subscription found yet. If you completed checkout, please wait a moment and try Refresh in Billing.");
          }
        }
      });
    } else if (checkoutStatus === "cancel") {
      toast.info("Checkout canceled.");
    }
  }, [checkoutStatus]);

  const handleStartTrial = async (plan: Plan) => {
    if (!currentUser) {
      navigate("/signup");
      return;
    }
    setLoadingPlan(plan);
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { plan, interval },
    });
    setLoadingPlan(null);
    if (error) {
      console.error(error);
      toast.error(error.message || "Unable to start checkout.");
      return;
    }
    const url = (data as any)?.url;
    if (url) {
      window.open(url, "_blank");
    } else {
      toast.error("Checkout session could not be created.");
    }
  };

  return (
    <div className="min-h-screen">
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight">Choose Your Plan — 30 Days Free</h1>
            <p className="text-muted-foreground mt-2">
              Pricing in AUD, billed per property. Cancel anytime before your trial ends.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-8">
            <span className={interval === "month" ? "font-semibold" : "text-muted-foreground"}>Monthly</span>
            <button
              className="inline-flex h-9 items-center rounded-full bg-muted px-1"
              onClick={() => setInterval(interval === "month" ? "year" : "month")}
            >
              <span
                className={`inline-block h-7 w-24 rounded-full bg-background shadow transition-all ${
                  interval === "month" ? "translate-x-0" : "translate-x-0"
                }`}
              >
                {/* purely visual toggle - kept simple */}
              </span>
              <span className="sr-only">Toggle billing interval</span>
            </button>
            <span className={interval === "year" ? "font-semibold" : "text-muted-foreground"}>Yearly</span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-lg border bg-card p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Starter</h3>
                <div className="text-2xl font-bold">
                  {interval === "month" ? "A$49" : "A$490"}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    /{interval === "month" ? "property/mo" : "property/yr"}
                  </span>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Up to 5 properties</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Core features</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Email support</li>
              </ul>
              <Button
                className="mt-6 w-full"
                onClick={() => handleStartTrial("starter")}
                disabled={loadingPlan === "starter"}
              >
                {loadingPlan === "starter" ? "Starting..." : "Start 30-Day Free Trial"}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">No charges until your trial ends.</p>
            </div>

            <div className="rounded-lg border bg-card p-6 shadow">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Pro</h3>
                <div className="text-2xl font-bold">
                  {interval === "month" ? "A$99" : "A$990"}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    /{interval === "month" ? "property/mo" : "property/yr"}
                  </span>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Unlimited properties</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Advanced features</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Priority support</li>
              </ul>
              <Button
                className="mt-6 w-full"
                onClick={() => handleStartTrial("pro")}
                disabled={loadingPlan === "pro"}
              >
                {loadingPlan === "pro" ? "Starting..." : "Start 30-Day Free Trial"}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">No charges until your trial ends.</p>
            </div>
          </div>

          <div className="mt-10 text-center text-sm text-muted-foreground">
            Secure payments via Stripe. You won’t be charged until your 30-day trial ends.
          </div>
        </div>
      </section>
    </div>
  );
};

export default Pricing;
