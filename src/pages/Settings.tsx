
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from '@/components/Navbar';
import UserManagement from '@/components/settings/UserManagement';
import { Card } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { useUserContext } from '@/contexts/UserContext';
import AdminRoleUpdater from '@/components/AdminRoleUpdater';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";

const Settings = () => {
  const { currentUser, isAdmin, loading, loadingError } = useUserContext();
  const [stableLoadingState, setStableLoadingState] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Improved stable loading state management with timeout safety
  useEffect(() => {
    // Reset error state when dependencies change
    setError(null);
    
    if (loadingError) {
      setError(loadingError.message || "Error loading user data");
      setStableLoadingState(false);
      return;
    }
    
    // Start with loading state
    setStableLoadingState(true);
    
    // Short delay to avoid flickering for fast loads
    const initialDelay = setTimeout(() => {
      if (!loading) {
        if (!currentUser) {
          setError("Unable to verify user credentials");
        }
        
        // Set stable loading state to false after short delay
        setTimeout(() => setStableLoadingState(false), 200);
      }
    }, 300);
    
    // Hard timeout to prevent infinite loading
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
  }, [currentUser, loading, loadingError, error, stableLoadingState]);
  
  // Show consistent loading state
  if (stableLoadingState) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
            <span className="text-blue-500">Loading settings...</span>
          </div>
        </main>
      </div>
    );
  }
  
  // Show error state if no user is found or there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        
        <Tabs defaultValue={isAdmin ? "users" : "account"}>
          <TabsList className="mb-4">
            {isAdmin && <TabsTrigger value="users">User Management</TabsTrigger>}
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
          
          <TabsContent value="account">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Account Settings</h2>
              {!isAdmin && <AdminRoleUpdater />}
              <p className="text-gray-500">Additional account settings will be implemented in a future update.</p>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Notification Settings</h2>
              <p className="text-gray-500">Notification settings will be implemented in a future update.</p>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
