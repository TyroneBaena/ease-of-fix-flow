import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserContext } from "@/contexts/UnifiedAuthContext";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

type Plan = "starter" | "pro";

const Pricing: React.FC = () => {
  const [loadingPlan, setLoadingPlan] = useState<Plan | null>(null);
  const navigate = useNavigate();
  const { currentUser } = useUserContext();

  const handleStartTrial = async (plan: Plan) => {
    if (!currentUser) {
      navigate("/signup");
      return;
    }
    setLoadingPlan(plan);
    
    // For now, skip paid plans and redirect directly to dashboard
    toast.success("Welcome! You now have access to all features.");
    navigate("/dashboard");
    
    setLoadingPlan(null);
  };

  return (
    <div className="min-h-screen">
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight">Welcome to Your Property Management Platform</h1>
            <p className="text-muted-foreground mt-2">
              Get started with full access to all features. No payment required.
            </p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="rounded-lg border bg-card p-8 text-center">
              <h3 className="text-2xl font-semibold mb-4">Full Access</h3>
              <div className="text-4xl font-bold text-primary mb-2">FREE</div>
              <p className="text-muted-foreground mb-6">Complete property management platform</p>
              
              <ul className="space-y-3 text-left mb-8">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Unlimited properties</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> All features included</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Contractor management</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Maintenance tracking</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Reports & analytics</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Email support</li>
              </ul>
              
              <Button
                className="w-full"
                onClick={() => handleStartTrial("pro")}
                disabled={loadingPlan === "pro"}
              >
                {loadingPlan === "pro" ? "Getting Started..." : "Get Started"}
              </Button>
              <p className="mt-4 text-sm text-muted-foreground">
                Start managing your properties today
              </p>
            </div>
          </div>

          <div className="mt-10 text-center text-sm text-muted-foreground">
            No payment required. Start using all features immediately.
          </div>
        </div>
      </section>
    </div>
  );
};

export default Pricing;