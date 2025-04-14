
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from 'sonner';

const AdminRoleUpdater = () => {
  const { currentUser, updateUserRole } = useSupabaseAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleMakeAdmin = async () => {
    try {
      setIsLoading(true);
      await updateUserRole('admin');
      toast.success("You are now an admin! Please refresh the page to see new admin options.");
    } catch (error) {
      console.error("Error making user admin:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">User Role Manager</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Current Role: <span className="text-blue-600">{currentUser?.role}</span></p>
              <p className="text-sm text-gray-500">{currentUser?.email}</p>
            </div>
            <Button 
              onClick={handleMakeAdmin} 
              disabled={isLoading || currentUser?.role === 'admin'}
            >
              {isLoading ? "Updating..." : currentUser?.role === 'admin' ? "Already Admin" : "Make Admin"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminRoleUpdater;
