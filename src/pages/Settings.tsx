
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from '@/components/Navbar';
import UserManagement from '@/components/settings/UserManagement';
import { Card } from '@/components/ui/card';
import { useUserContext } from '@/contexts/UserContext';
import AdminRoleUpdater from '@/components/AdminRoleUpdater';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

const Settings = () => {
  const { currentUser, isAdmin, loading } = useUserContext();
  const [ready, setReady] = useState(false);
  
  // Improved loading state management
  useEffect(() => {
    // Set up primary timer
    const timer = setTimeout(() => {
      if (!loading && currentUser) {
        console.log("Settings: User data loaded successfully");
        setReady(true);
      }
    }, 300);
    
    // Set up backup timer to prevent infinite loading
    const backupTimer = setTimeout(() => {
      if (!ready) {
        console.log("Settings: Backup timer triggered to prevent infinite loading");
        setReady(true);
      }
    }, 2500);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(backupTimer);
    };
  }, [currentUser, loading, ready]);
  
  // Show loading state
  if (!ready) {
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
  
  // Show error state if no user is found
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>
              Unable to load user data. Please try refreshing the page or signing out and back in.
            </AlertDescription>
          </Alert>
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
