import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BillingManagementPage } from "@/components/billing/BillingManagementPage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSecurityAnalytics } from "@/hooks/useSecurityAnalytics";
import { SecurityMetricsCard } from "@/components/security/SecurityMetricsCard";
import { RecentLoginAttempts } from "@/components/security/RecentLoginAttempts";
import { Shield, CreditCard, AlertTriangle, Users, Activity } from "lucide-react";
import { useSimpleAuth } from "@/contexts/UnifiedAuthContext";

const AdminSettings: React.FC = () => {
  const { isAdmin } = useSimpleAuth();
  const [activeTab, setActiveTab] = useState("billing");
  const { metrics, loading, error } = useSecurityAnalytics();

  const hasSecurityConcerns = metrics && metrics.failedLoginsToday > 5;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Billing & Security</h1>
            <p className="text-muted-foreground mt-2">
              Manage billing and security settings for your organization
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={`grid w-full max-w-md ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <TabsTrigger value="billing" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Billing
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="security" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="billing" className="mt-6">
              <BillingManagementPage />
            </TabsContent>

            {isAdmin && (
              <TabsContent value="security" className="mt-6 space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Error loading security data: {error}
                  </AlertDescription>
                </Alert>
              )}

              {hasSecurityConcerns && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Security Alert: High number of failed login attempts detected today.
                    Please review the recent login attempts below.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-6 md:grid-cols-3">
                <SecurityMetricsCard
                  title="Active Users"
                  value={loading ? '...' : metrics.activeSessionsCount}
                  description="Currently active users"
                  icon={Users}
                  variant="default"
                />
                <SecurityMetricsCard
                  title="Failed Logins Today"
                  value={loading ? '...' : metrics.failedLoginsToday}
                  description="Failed authentication attempts"
                  icon={AlertTriangle}
                  variant={hasSecurityConcerns ? 'danger' : 'default'}
                />
                <SecurityMetricsCard
                  title="Total Logins Today"
                  value={loading ? '...' : metrics.totalLoginsToday}
                  description="All login attempts today"
                  icon={Activity}
                  variant="default"
                />
              </div>

              <RecentLoginAttempts 
                attempts={metrics.recentLoginAttempts}
                loading={loading}
              />

              <Alert>
                <AlertDescription>
                  Security data is refreshed every 5 minutes and shows activity from the last 24 hours.
                </AlertDescription>
              </Alert>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default AdminSettings;
