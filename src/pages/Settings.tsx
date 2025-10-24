
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from '@/components/Navbar';
import UserManagement from '@/components/settings/UserManagement';
import ContractorManagement from '@/components/settings/ContractorManagement';
import { Card } from '@/components/ui/card';
import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';
import { useUserContext } from '@/contexts/UserContext';
import AdminRoleUpdater from '@/components/AdminRoleUpdater';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import AccountSettings from '@/components/settings/AccountSettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import { NotificationTestPanel } from '@/components/settings/NotificationTestPanel';
import { Toaster } from "sonner";
import { TeamManagement } from '@/pages/TeamManagement';
import { GoogleMapsSettings } from '@/components/maps/GoogleMapsSettings';
import { BillingManagementPage } from '@/components/billing/BillingManagementPage';
import { useSecurityAnalytics } from '@/hooks/useSecurityAnalytics';
import { SecurityMetricsCard } from '@/components/security/SecurityMetricsCard';
import { RecentLoginAttempts } from '@/components/security/RecentLoginAttempts';
import { Users, Activity } from 'lucide-react';


const Settings = () => {
  const { currentUser, loading } = useSimpleAuth();
  const { users } = useUserContext();
  const isAdmin = currentUser?.role === 'admin';
  const [stableLoadingState, setStableLoadingState] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingSecurityTab, setBillingSecurityTab] = useState("billing");
  const { metrics, loading: securityLoading, error: securityError } = useSecurityAnalytics();
  
  const hasSecurityConcerns = metrics && metrics.failedLoginsToday > 5;
  
  // Improved stable loading state management
  useEffect(() => {
    // Reset error state when dependencies change
    setError(null);

    const initialDelay = setTimeout(() => {
      if (!loading) {
        if (!currentUser) {
          setError("Unable to verify user credentials");
        }
  
        setStableLoadingState(false);
      }
    }, 300);
  
    const backupTimeout = setTimeout(() => {
      if (stableLoadingState) {
        console.log("Settings: Forcing exit from loading state after timeout");
        setStableLoadingState(false);
        if (!error && !currentUser) {
          setError("Loading timed out - please try refreshing");
        }
      }
    }, 4000);
  
    return () => {
      clearTimeout(initialDelay);
      clearTimeout(backupTimeout);
    };
  }, [currentUser, loading]);
  
  
  // Show consistent loading state
  if (stableLoadingState) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
            <span className="text-blue-500">Loading settings...</span>
          </div>
        </main>
      </div>
    );
  }
  
  // Show error state if no user is found
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Toaster position="bottom-right" richColors />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        
        <Tabs defaultValue={isAdmin ? "users" : "account"}>
          <TabsList className="mb-4">
            {isAdmin && <TabsTrigger value="users">User Management</TabsTrigger>}
            {/* Only show contractor management to admins, not managers */}
            {isAdmin && <TabsTrigger value="contractors">Contractor Management</TabsTrigger>}
            {isAdmin && <TabsTrigger value="team">Team Management</TabsTrigger>}
            {isAdmin && <TabsTrigger value="app">App Settings</TabsTrigger>}
            {isAdmin && <TabsTrigger value="billing">Billing & Security</TabsTrigger>}
            <TabsTrigger value="account">Account Settings</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          
          {isAdmin && (
            <TabsContent value="users">
              <Card className="p-6">
                <UserManagement />
              </Card>
            </TabsContent>
          )}
          
          {/* Contractor management is restricted to admins only */}
          {isAdmin && (
            <TabsContent value="contractors">
              <Card className="p-6">
                <ContractorManagement />
              </Card>
            </TabsContent>
          )}
          
          {/* Team management is restricted to admins only */}
          {isAdmin && (
            <TabsContent value="team">
              <TeamManagement />
            </TabsContent>
          )}
          
          {/* App Settings - Google Maps etc. - Admin only */}
          {isAdmin && (
            <TabsContent value="app">
              <div className="max-w-2xl">
                <GoogleMapsSettings />
              </div>
            </TabsContent>
          )}
          
          {/* Billing & Security - Admin only */}
          {isAdmin && (
            <TabsContent value="billing" className="w-full">
              <Tabs value={billingSecurityTab} onValueChange={setBillingSecurityTab} className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="billing">Billing</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                </TabsList>

                <TabsContent value="billing" className="mt-6">
                  <BillingManagementPage embedded={true} />
                </TabsContent>

                <TabsContent value="security" className="mt-6 space-y-6">
                  {securityError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Error loading security data: {securityError}
                      </AlertDescription>
                    </Alert>
                  )}

                  {hasSecurityConcerns && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Security Alert: High number of failed login attempts detected today.
                        Please review the recent login attempts below.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid gap-6 md:grid-cols-3">
                    <SecurityMetricsCard
                      title="Active Users"
                      value={securityLoading ? '...' : metrics.activeSessionsCount}
                      description="Currently active users"
                      icon={Users}
                      variant="default"
                    />
                    <SecurityMetricsCard
                      title="Failed Logins Today"
                      value={securityLoading ? '...' : metrics.failedLoginsToday}
                      description="Failed authentication attempts"
                      icon={AlertCircle}
                      variant={hasSecurityConcerns ? 'danger' : 'default'}
                    />
                    <SecurityMetricsCard
                      title="Total Logins Today"
                      value={securityLoading ? '...' : metrics.totalLoginsToday}
                      description="All login attempts today"
                      icon={Activity}
                      variant="default"
                    />
                  </div>

                  <RecentLoginAttempts 
                    attempts={metrics.recentLoginAttempts}
                    loading={securityLoading}
                  />

                  <Alert>
                    <AlertDescription>
                      Security data is refreshed every 5 minutes and shows activity from the last 24 hours.
                    </AlertDescription>
                  </Alert>
                </TabsContent>
              </Tabs>
            </TabsContent>
          )}
          
          <TabsContent value="account">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Account Settings</h2>
              {!isAdmin && <AdminRoleUpdater />}
              {currentUser && <AccountSettings user={currentUser} />}
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications">
            <div className="space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Notification Settings</h2>
                {currentUser && <NotificationSettings user={currentUser} />}
              </Card>
              
              <NotificationTestPanel />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
