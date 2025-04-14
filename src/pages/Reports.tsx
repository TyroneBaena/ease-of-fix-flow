
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MaintenanceReport from '@/components/reports/MaintenanceReport';
import { useUserContext } from '@/contexts/UserContext';
import { usePropertyContext } from '@/contexts/property';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const Reports = () => {
  const { currentUser, loading: userLoading } = useUserContext();
  const { loading: propertiesLoading, loadingFailed } = usePropertyContext();
  const [activeTab, setActiveTab] = useState("maintenance");
  const [error, setError] = useState<string | null>(null);
  const [stableLoadingState, setStableLoadingState] = useState(true);
  
  // Use a better loading mechanism with stable state
  useEffect(() => {
    // Reset error state when dependencies change
    setError(null);
    
    // Start with loading state
    setStableLoadingState(true);
    
    // Short delay to avoid flickering for fast loads
    const initialDelay = setTimeout(() => {
      // Only update if both user and properties loading states are settled
      if (!userLoading && !propertiesLoading) {
        if (loadingFailed) {
          setError("Failed to load property data");
        } else if (!currentUser) {
          setError("Unable to verify user credentials");
        }
        
        // Set stable loading state to false after short delay
        setTimeout(() => setStableLoadingState(false), 200);
      }
    }, 300);
    
    // Hard timeout to prevent infinite loading
    const backupTimeout = setTimeout(() => {
      if (stableLoadingState) {
        console.log("Reports: Forcing exit from loading state after timeout");
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
  }, [currentUser, userLoading, propertiesLoading, loadingFailed]);

  // Show consistent loading state
  if (stableLoadingState) {
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

  // If there's an error, show an error message
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
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
