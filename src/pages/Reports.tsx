import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MaintenanceReport from '@/components/reports/MaintenanceReport';
import BulkInvoiceDownload from '@/components/reports/BulkInvoiceDownload';
import ReportsOverview from '@/components/reports/overview/ReportsOverview';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { usePropertyContext } from '@/contexts/property';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { useActivityTracking } from '@/hooks/useActivityTracking';

const Reports = () => {
  const { currentUser, loading: userLoading, isAdmin } = useUserContext();
  const { loading: propertiesLoading, loadingFailed } = usePropertyContext();
  const { trackPageView } = useActivityTracking();
  const [activeTab, setActiveTab] = useState("maintenance");
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Track page view
  useEffect(() => {
    trackPageView('reports');
  }, [trackPageView]);
  
  // Force refresh of reports data
  const handleRefresh = useCallback(() => {
    toast.info("Refreshing report data...");
    setRefreshKey(prev => prev + 1);
  }, []);
  
  // Set up realtime subscription for maintenance requests
  useEffect(() => {
    if (!currentUser) return;
    
    // Subscribe to maintenance_requests changes
    const channel = supabase.channel('reports-maintenance-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        table: 'maintenance_requests'
      }, () => {
        // When a change happens, automatically refresh after a short delay
        setTimeout(() => {
          toast.info("Report data updated");
          setRefreshKey(prev => prev + 1);
        }, 300);
      })
      .subscribe();
    
    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  // CRITICAL FIX: Don't show loading on tab switches
  // The providers already handle loading state correctly after initial load
  // Only show loading during the very first load (when there's no user yet but we're loading)
  const isInitialLoad = userLoading && !currentUser;

  // Show error if loading failed
  if (loadingFailed) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Failed to load property data</AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-6">Reports</h1>
        
        <Tabs defaultValue="maintenance" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="maintenance">Maintenance Requests</TabsTrigger>
            {isAdmin && <TabsTrigger value="invoices">Invoice Downloads</TabsTrigger>}
            <TabsTrigger value="overview">Overview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="maintenance">
            <Card className="p-6">
              <MaintenanceReport key={`maintenance-report-${refreshKey}`} />
            </Card>
          </TabsContent>
          
          {isAdmin && (
            <TabsContent value="invoices">
              <BulkInvoiceDownload />
            </TabsContent>
          )}
          
          <TabsContent value="overview">
            <ReportsOverview key={`overview-${refreshKey}`} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Reports;
