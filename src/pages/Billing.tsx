import React from "react";
import { SubscriptionProvider } from "@/contexts/subscription/SubscriptionContext";
import { PropertyProvider } from "@/contexts/property/PropertyContext";
import { BillingManagementPage } from "@/components/billing/BillingManagementPage";

const Billing: React.FC = () => {
  return (
    <SubscriptionProvider>
      <PropertyProvider>
        <BillingManagementPage />
      </PropertyProvider>
    </SubscriptionProvider>
  );
};

export default Billing;