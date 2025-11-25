// import React, { useState, useEffect } from 'react';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import Navbar from '@/components/Navbar';
// import UserManagement from '@/components/settings/UserManagement';
// import ContractorManagement from '@/components/settings/ContractorManagement';
// import { Card } from '@/components/ui/card';
// import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';
// import { useUserContext } from '@/contexts/UserContext';
// import AdminRoleUpdater from '@/components/AdminRoleUpdater';
// import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
// import { Loader2, AlertCircle } from "lucide-react";
// import AccountSettings from '@/components/settings/AccountSettings';
// import NotificationSettings from '@/components/settings/NotificationSettings';
// import { Toaster } from "sonner";
// import { TeamManagement } from '@/pages/TeamManagement';
// import { GoogleMapsSettings } from '@/components/maps/GoogleMapsSettings';
// import { BillingManagementPage } from '@/components/billing/BillingManagementPage';
// import { useSecurityAnalytics } from '@/hooks/useSecurityAnalytics';
// import { SecurityMetricsCard } from '@/components/security/SecurityMetricsCard';
// import { RecentLoginAttempts } from '@/components/security/RecentLoginAttempts';
// import { Users, Activity } from 'lucide-react';

// const Settings = () => {
//   const { currentUser, loading } = useSimpleAuth();
//   const { users } = useUserContext();
//   const isAdmin = currentUser?.role === 'admin';
//   const [stableLoadingState, setStableLoadingState] = useState(true);
//   const hasLoadedOnceRef = React.useRef(false); // CRITICAL: Use ref to prevent reset on remount
//   const [error, setError] = useState<string | null>(null);
//   const [billingSecurityTab, setBillingSecurityTab] = useState("billing");
//   const { metrics, loading: securityLoading, error: securityError } = useSecurityAnalytics();

//   const hasSecurityConcerns = metrics && metrics.failedLoginsToday > 5;

//   // CRITICAL FIX: Prevent loading state on tab switches after initial load
//   useEffect(() => {
//     // Reset error state when dependencies change
//     setError(null);

//     // If we've loaded once, don't show loading again
//     if (hasLoadedOnceRef.current && currentUser) {
//       setStableLoadingState(false);
//       return;
//     }

//     const initialDelay = setTimeout(() => {
//       if (!loading) {
//         if (!currentUser) {
//           setError("Unable to verify user credentials");
//         } else {
//           hasLoadedOnceRef.current = true;
//         }

//         setStableLoadingState(false);
//       }
//     }, 300);

//     const backupTimeout = setTimeout(() => {
//       if (stableLoadingState) {
//         console.log("Settings: Forcing exit from loading state after timeout");
//         setStableLoadingState(false);
//         if (!error && !currentUser) {
//           setError("Loading timed out - please try refreshing");
//         }
//       }
//     }, 4000);

//     return () => {
//       clearTimeout(initialDelay);
//       clearTimeout(backupTimeout);
//     };
//   }, [currentUser, loading, stableLoadingState, error]);

//   // Show consistent loading state only on first load
//   if (stableLoadingState && !hasLoadedOnceRef.current) {
//     return (
//       <div className="min-h-screen bg-gray-50">
//         <Navbar />
//         <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//           <div className="flex flex-col items-center justify-center h-64">
//             <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
//             <span className="text-blue-500">Loading settings...</span>
//           </div>
//         </main>
//       </div>
//     );
//   }

//   // Show error state if no user is found
//   if (error) {
//     return (
//       <div className="min-h-screen bg-gray-50">
//         <Navbar />
//         <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//           <Alert variant="destructive" className="mb-6">
//             <AlertCircle className="h-4 w-4" />
//             <AlertTitle>Authentication Error</AlertTitle>
//             <AlertDescription>
//               {error}
//             </AlertDescription>
//           </Alert>
//         </main>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <Navbar />
//       <Toaster position="bottom-right" richColors />
//       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         <h1 className="text-2xl font-bold mb-6">Settings</h1>

//         <Tabs defaultValue={isAdmin ? "users" : "account"}>
//           <TabsList className="mb-4">
//             {isAdmin && <TabsTrigger value="users">User Management</TabsTrigger>}
//             {/* Only show contractor management to admins, not managers */}
//             {isAdmin && <TabsTrigger value="contractors">Contractor Management</TabsTrigger>}
//             {isAdmin && <TabsTrigger value="team">Team Management</TabsTrigger>}
//             {/* Commented out - App Settings tab not needed */}
//             {/* {isAdmin && <TabsTrigger value="app">App Settings</TabsTrigger>} */}
//             {isAdmin && <TabsTrigger value="billing">Billing & Security</TabsTrigger>}
//             <TabsTrigger value="account">Account Settings</TabsTrigger>
//             <TabsTrigger value="notifications">Notifications</TabsTrigger>
//           </TabsList>

//           {isAdmin && (
//             <TabsContent value="users">
//               <Card className="p-6">
//                 <UserManagement />
//               </Card>
//             </TabsContent>
//           )}

//           {/* Contractor management is restricted to admins only */}
//           {isAdmin && (
//             <TabsContent value="contractors">
//               <Card className="p-6">
//                 <ContractorManagement />
//               </Card>
//             </TabsContent>
//           )}

//           {/* Team management is restricted to admins only */}
//           {isAdmin && (
//             <TabsContent value="team">
//               <TeamManagement />
//             </TabsContent>
//           )}

//           {/* App Settings - Google Maps etc. - Admin only */}
//           {/* Commented out as per user request - not needed in UI
//           {isAdmin && (
//             <TabsContent value="app">
//               <div className="max-w-2xl">
//                 <GoogleMapsSettings />
//               </div>
//             </TabsContent>
//           )}
//           */}

//           {/* Billing & Security - Admin only */}
//           {isAdmin && (
//             <TabsContent value="billing" className="w-full">
//               <Tabs value={billingSecurityTab} onValueChange={setBillingSecurityTab} className="w-full">
//                 <TabsList className="mb-4">
//                   <TabsTrigger value="billing">Billing</TabsTrigger>
//                   <TabsTrigger value="security">Security</TabsTrigger>
//                 </TabsList>

//                 <TabsContent value="billing" className="mt-6">
//                   <BillingManagementPage embedded={true} />
//                 </TabsContent>

//                 <TabsContent value="security" className="mt-6 space-y-6">
//                   {securityError && (
//                     <Alert variant="destructive">
//                       <AlertCircle className="h-4 w-4" />
//                       <AlertDescription>
//                         Error loading security data: {securityError}
//                       </AlertDescription>
//                     </Alert>
//                   )}

//                   {hasSecurityConcerns && (
//                     <Alert variant="destructive">
//                       <AlertCircle className="h-4 w-4" />
//                       <AlertDescription>
//                         Security Alert: High number of failed login attempts detected today.
//                         Please review the recent login attempts below.
//                       </AlertDescription>
//                     </Alert>
//                   )}

//                   <div className="grid gap-6 md:grid-cols-3">
//                     <SecurityMetricsCard
//                       title="Active Users"
//                       value={securityLoading ? '...' : metrics.activeSessionsCount}
//                       description="Currently active users"
//                       icon={Users}
//                       variant="default"
//                     />
//                     <SecurityMetricsCard
//                       title="Failed Logins Today"
//                       value={securityLoading ? '...' : metrics.failedLoginsToday}
//                       description="Failed authentication attempts"
//                       icon={AlertCircle}
//                       variant={hasSecurityConcerns ? 'danger' : 'default'}
//                     />
//                     <SecurityMetricsCard
//                       title="Total Logins Today"
//                       value={securityLoading ? '...' : metrics.totalLoginsToday}
//                       description="All login attempts today"
//                       icon={Activity}
//                       variant="default"
//                     />
//                   </div>

//                   <RecentLoginAttempts
//                     attempts={metrics.recentLoginAttempts}
//                     loading={securityLoading}
//                   />

//                   <Alert>
//                     <AlertDescription>
//                       Security data is refreshed every 5 minutes and shows activity from the last 24 hours.
//                     </AlertDescription>
//                   </Alert>
//                 </TabsContent>
//               </Tabs>
//             </TabsContent>
//           )}

//           <TabsContent value="account">
//             <Card className="p-6">
//               <h2 className="text-xl font-semibold mb-4">Account Settings</h2>
//               {!isAdmin && <AdminRoleUpdater />}
//               {currentUser && <AccountSettings user={currentUser} />}
//             </Card>
//           </TabsContent>

//           <TabsContent value="notifications">
//             <Card className="p-6">
//               <h2 className="text-xl font-semibold mb-4">Notification Settings</h2>
//               {currentUser && <NotificationSettings user={currentUser} />}
//             </Card>
//           </TabsContent>
//         </Tabs>
//       </main>
//     </div>
//   );
// };

// export default Settings;

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/Navbar";
import UserManagement from "@/components/settings/UserManagement";
import ContractorManagement from "@/components/settings/ContractorManagement";
import { Card } from "@/components/ui/card";
import { useSimpleAuth } from "@/contexts/UnifiedAuthContext";
import { useUserContext } from "@/contexts/UserContext";
import AdminRoleUpdater from "@/components/AdminRoleUpdater";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import AccountSettings from "@/components/settings/AccountSettings";
import NotificationSettings from "@/components/settings/NotificationSettings";
import { Toaster } from "sonner";
import { TeamManagement } from "@/pages/TeamManagement";
import { GoogleMapsSettings } from "@/components/maps/GoogleMapsSettings";
import { BillingManagementPage } from "@/components/billing/BillingManagementPage";
import { useSecurityAnalytics } from "@/hooks/useSecurityAnalytics";
import { SecurityMetricsCard } from "@/components/security/SecurityMetricsCard";
import { RecentLoginAttempts } from "@/components/security/RecentLoginAttempts";
import { Users, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Settings = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { currentUser, loading } = useSimpleAuth();
  const { users } = useUserContext();
  const isAdmin = currentUser?.role === "admin";
  const [billingSecurityTab, setBillingSecurityTab] = useState("billing");
  const { metrics, loading: securityLoading, error: securityError } = useSecurityAnalytics();

  // Get tab from URL parameter, default based on user role
  const tabParam = searchParams.get('tab');
  const defaultTab = tabParam || (isAdmin ? "users" : "account");

  const hasSecurityConcerns = metrics && metrics.failedLoginsToday > 5;

  // React Query based profile fetch with manual window focus handler for tab revisit
  const { refetch: refetchProfile } = useQuery({
    queryKey: ["settings-profile", currentUser?.id],
    queryFn: async () => {
      console.log("Settings/useQuery: Fetching profile for user:", currentUser?.id);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser!.id)
        .maybeSingle();

      if (error) {
        console.error("Settings/useQuery: Error fetching profile:", error);
        throw error;
      }

      console.log("Settings/useQuery: Profile data fetched successfully:", data);
      return data;
    },
    enabled: !!currentUser?.id,
    refetchOnWindowFocus: false, // Disabled - using manual handler below
    staleTime: 0,
  });

  // Window focus handler - trigger auth refresh on every tab revisit
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('Settings: Tab gained focus - triggering full session refresh');
        
        // Force Supabase to refresh the session which will cascade to profile fetch
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error('Settings: Session refresh error:', error);
        } else {
          console.log('Settings: Session refreshed successfully');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // v79.1: Simplified loading state - no timeout hacks needed
  // React Query configuration prevents aggressive refetching
  if (loading) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Toaster position="bottom-right" richColors />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-4">
            {isAdmin && <TabsTrigger value="users">User Management</TabsTrigger>}
            {/* Only show contractor management to admins, not managers */}
            {isAdmin && <TabsTrigger value="contractors">Contractor Management</TabsTrigger>}
            {isAdmin && <TabsTrigger value="team">Team Management</TabsTrigger>}
            {/* Commented out - App Settings tab not needed */}
            {/* {isAdmin && <TabsTrigger value="app">App Settings</TabsTrigger>} */}
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
          {/* Commented out as per user request - not needed in UI
          {isAdmin && (
            <TabsContent value="app">
              <div className="max-w-2xl">
                <GoogleMapsSettings />
              </div>
            </TabsContent>
          )}
          */}

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
                      <AlertDescription>Error loading security data: {securityError}</AlertDescription>
                    </Alert>
                  )}

                  {hasSecurityConcerns && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Security Alert: High number of failed login attempts detected today. Please review the recent
                        login attempts below.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="grid gap-6 md:grid-cols-3">
                    <SecurityMetricsCard
                      title="Active Users"
                      value={securityLoading ? "..." : metrics.activeSessionsCount}
                      description="Currently active users"
                      icon={Users}
                      variant="default"
                    />
                    <SecurityMetricsCard
                      title="Failed Logins Today"
                      value={securityLoading ? "..." : metrics.failedLoginsToday}
                      description="Failed authentication attempts"
                      icon={AlertCircle}
                      variant={hasSecurityConcerns ? "danger" : "default"}
                    />
                    <SecurityMetricsCard
                      title="Total Logins Today"
                      value={securityLoading ? "..." : metrics.totalLoginsToday}
                      description="All login attempts today"
                      icon={Activity}
                      variant="default"
                    />
                  </div>

                  <RecentLoginAttempts attempts={metrics.recentLoginAttempts} loading={securityLoading} />

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
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Notification Settings</h2>
              {currentUser && <NotificationSettings user={currentUser} />}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
