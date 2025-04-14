
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MaintenanceReport from '@/components/reports/MaintenanceReport';
import { useUserContext } from '@/contexts/UserContext';
import { Loader2 } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const Reports = () => {
  const { isAdmin, loading: userLoading, currentUser } = useUserContext();
  const [activeTab, setActiveTab] = useState("maintenance");
  const [error, setError] = useState<string | null>(null);
  const [stableLoading, setStableLoading] = useState(true);
  
  // Handle loading and reset error state when component mounts or user changes
  useEffect(() => {
    setError(null);
    
    // Set a stable loading state to prevent flickering
    const initialLoadingTimer = setTimeout(() => {
      setStableLoading(false);
    }, 1000);
    
    return () => clearTimeout(initialLoadingTimer);
  }, []);

  // If the user context is still initializing or in stable loading state
  if ((userLoading || stableLoading)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
            <span className="text-blue-500">Loading reports...</span>
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
