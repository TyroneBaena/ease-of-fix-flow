
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MaintenanceReport from '@/components/reports/MaintenanceReport';
import { useUserContext } from '@/contexts/UserContext';
import { Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const Reports = () => {
  const { isAdmin, loading, currentUser } = useUserContext();
  const [activeTab, setActiveTab] = useState("maintenance");
  const [error, setError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(true);

  // Handle initial loading and reset error state when component mounts or user changes
  useEffect(() => {
    setError(null);
    
    // Set a timeout to prevent infinite loading state
    const timer = setTimeout(() => {
      setLocalLoading(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [currentUser]);

  // Show loading state if user data is still loading, but only for a limited time
  if (loading && localLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-blue-500">Loading reports...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Reports</h1>
        
        <Tabs defaultValue="maintenance" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="maintenance">Maintenance Requests</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="maintenance">
            <Card className="p-6">
              <MaintenanceReport />
            </Card>
          </TabsContent>
          
          <TabsContent value="overview">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Reports Overview</h2>
              <p className="text-gray-500">Additional reports will be available in future updates.</p>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Reports;
