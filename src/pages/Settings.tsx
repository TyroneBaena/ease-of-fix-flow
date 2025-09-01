
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from '@/components/Navbar';
import UserManagement from '@/components/settings/UserManagement';
import ContractorManagement from '@/components/settings/ContractorManagement';
import { Card } from '@/components/ui/card';
import { useUserContext } from '@/contexts/UserContext';
import AdminRoleUpdater from '@/components/AdminRoleUpdater';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import AccountSettings from '@/components/settings/AccountSettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import InvoiceManagement from '@/components/settings/InvoiceManagement';
import { Toaster } from "sonner";
import DevToolsPanel from '@/components/DevToolsPanel';

const Settings = () => {
  const { currentUser, isAdmin, loading } = useUserContext();
  const [stableLoadingState, setStableLoadingState] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
        
        <DevToolsPanel />
        
        <Tabs defaultValue={isAdmin ? "users" : "account"}>
          <TabsList className="mb-4">
            {isAdmin && <TabsTrigger value="users">User Management</TabsTrigger>}
            {/* Only show contractor management to admins, not managers */}
            {isAdmin && <TabsTrigger value="contractors">Contractor Management</TabsTrigger>}
            {isAdmin && <TabsTrigger value="invoices">Invoice Management</TabsTrigger>}
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

          {/* Invoice management is restricted to admins only */}
          {isAdmin && (
            <TabsContent value="invoices">
              <Card className="p-6">
                <InvoiceManagement />
              </Card>
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
