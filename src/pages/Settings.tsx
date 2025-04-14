
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from '@/components/Navbar';
import UserManagement from '@/components/settings/UserManagement';
import { Card } from '@/components/ui/card';
import { useUserContext } from '@/contexts/UserContext';
import AdminRoleUpdater from '@/components/AdminRoleUpdater';
import { checkIsAdmin } from '@/contexts/user/userUtils';

const Settings = () => {
  const { isAdmin, currentUser } = useUserContext();
  const userIsAdmin = currentUser ? checkIsAdmin(currentUser) : false;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        
        <Tabs defaultValue={userIsAdmin ? "users" : "account"}>
          <TabsList className="mb-4">
            {userIsAdmin && <TabsTrigger value="users">User Management</TabsTrigger>}
            <TabsTrigger value="account">Account Settings</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          
          {userIsAdmin && (
            <TabsContent value="users">
              <Card className="p-6">
                <UserManagement />
              </Card>
            </TabsContent>
          )}
          
          <TabsContent value="account">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Account Settings</h2>
              {!userIsAdmin && <AdminRoleUpdater />}
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
