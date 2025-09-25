import React from "react";
import { SubscriptionProvider } from "@/contexts/subscription/SubscriptionContext";
import { PropertyProvider } from "@/contexts/property/PropertyContext";
import { TrialBillingPage } from "@/components/billing";

const Billing: React.FC = () => {
  return (
    <SubscriptionProvider>
      <PropertyProvider>
        <TrialBillingPage />
      </PropertyProvider>
    </SubscriptionProvider>
  );
};

export default Billing;