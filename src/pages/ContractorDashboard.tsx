
import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { ContractorStats } from '@/components/contractor/ContractorStats';
import { ContractorRequests } from '@/components/contractor/ContractorRequests';
import { ContractorHeader } from '@/components/contractor/ContractorHeader';
import { useUserContext } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { MaintenanceRequest } from '@/types/maintenance';
import { Quote } from '@/types/contractor';
import { RequestsTable } from '@/components/contractor/requests/RequestsTable';
import { QuoteRequestDialog } from '@/components/contractor/QuoteRequestDialog';
import { ContractorProvider } from '@/contexts/contractor';
import { toast } from '@/lib/toast';

const ContractorDashboard = () => {
  const { currentUser } = useUserContext();
  const [pendingQuoteRequests, setPendingQuoteRequests] = useState<MaintenanceRequest[]>([]);
  const [activeJobs, setActiveJobs] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  
  useEffect(() => {
    if (currentUser) {
      fetchContractorData();
    }
  }, [currentUser]);
  
  const fetchContractorData = async () => {
    try {
      setLoading(true);
      
      // First get the contractor ID for the current user
      const { data: contractorData, error: contractorError } = await supabase
        .from('contractors')
        .select('id')
        .eq('user_id', currentUser?.id)
        .single();
        
      if (contractorError) throw contractorError;
      
      if (contractorData?.id) {
        // Fetch quote requests for this contractor
        const { data: quotes, error: quotesError } = await supabase
          .from('quotes')
          .select('*, maintenance_requests(*)')
          .eq('contractor_id', contractorData.id)
          .eq('status', 'requested');
          
        if (quotesError) throw quotesError;
        
        // Fetch active jobs where this contractor is assigned
        const { data: jobs, error: jobsError } = await supabase
          .from('maintenance_requests')
          .select('*')
          .eq('contractor_id', contractorData.id)
          .eq('status', 'in-progress');
          
        if (jobsError) throw jobsError;
        
        // Map the requests from the quotes
        const pendingRequests = quotes.map((quote: any) => ({
          ...quote.maintenance_requests,
          quote: quote
        }));
        
        setPendingQuoteRequests(pendingRequests);
        setActiveJobs(jobs);
      }
    } catch (error) {
      console.error('Error fetching contractor data:', error);
      toast.error('Failed to load contractor dashboard data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSelectRequest = (request: MaintenanceRequest) => {
    setSelectedRequest(request);
    setQuoteDialogOpen(true);
  };
  
  const handleQuoteSubmit = async (amount: number, description: string) => {
    if (!selectedRequest) return;
    
    try {
      const { data: contractorData } = await supabase
        .from('contractors')
        .select('id')
        .eq('user_id', currentUser?.id)
        .single();
        
      if (!contractorData?.id) return;
      
      // Update the quote status
      const { error } = await supabase
        .from('quotes')
        .update({
          amount,
          description,
          status: 'pending',
          submitted_at: new Date().toISOString()
        })
        .eq('request_id', selectedRequest.id)
        .eq('contractor_id', contractorData.id)
        .eq('status', 'requested');
        
      if (error) throw error;
      
      toast.success('Quote submitted successfully');
      
      // Refresh data
      fetchContractorData();
      setQuoteDialogOpen(false);
    } catch (error) {
      console.error('Error submitting quote:', error);
      toast.error('Failed to submit quote');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ContractorHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <ContractorStats />
            
            {/* Quote Requests Section */}
            <Card className="p-6">
              <h2 className="font-semibold text-lg mb-4">Quote Requests</h2>
              {loading ? (
                <p>Loading quote requests...</p>
              ) : (
                <RequestsTable 
                  requests={pendingQuoteRequests} 
                  onSelectRequest={handleSelectRequest} 
                />
              )}
            </Card>
            
            {/* Active Jobs Section */}
            <Card className="p-6">
              <h2 className="font-semibold text-lg mb-4">Active Jobs</h2>
              {loading ? (
                <p>Loading active jobs...</p>
              ) : (
                <ContractorProvider>
                  <ContractorRequests />
                </ContractorProvider>
              )}
            </Card>
          </div>
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="font-semibold mb-4">Quick Actions</h2>
              {/* Quick actions will be added here */}
            </Card>
          </div>
        </div>
      </main>
      
      <ContractorProvider>
        <QuoteRequestDialog 
          open={quoteDialogOpen}
          onOpenChange={setQuoteDialogOpen}
          requestDetails={selectedRequest}
          onSubmitQuote={handleQuoteSubmit}
        />
      </ContractorProvider>
    </div>
  );
};

export default ContractorDashboard;
