
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserContext } from "@/contexts/UnifiedAuthContext";
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
  return (
    <div className="min-h-screen">
      <section className="py-10">
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground mt-2">
            Currently, all features are available for free.
          </p>

          <div className="mt-6 rounded-lg border bg-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Free Access</div>
                <div className="text-sm text-muted-foreground">
                  You have access to all features at no cost.
                </div>
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
