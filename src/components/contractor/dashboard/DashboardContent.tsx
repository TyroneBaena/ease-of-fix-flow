
import React from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContractorMetrics } from '@/components/contractor/dashboard/ContractorMetrics';
import { RequestsTable } from '@/components/contractor/requests/RequestsTable';
import { QuickActionsCard } from './QuickActionsCard';
import { MaintenanceRequest } from '@/types/maintenance';

interface DashboardContentProps {
  filteredQuoteRequests: MaintenanceRequest[];
  filteredActiveJobs: MaintenanceRequest[];
  filteredCompletedJobs: MaintenanceRequest[];
  loading: boolean;
  onSelectRequest: (request: MaintenanceRequest) => void;
}

export const DashboardContent: React.FC<DashboardContentProps> = ({
  filteredQuoteRequests,
  filteredActiveJobs,
  filteredCompletedJobs,
  loading,
  onSelectRequest
}) => {
  console.log('DashboardContent - Quote Requests received:', filteredQuoteRequests.length);
  console.log('DashboardContent - Quote Requests data:', filteredQuoteRequests.map(r => ({
    id: r.id.substring(0, 8),
    title: r.title,
    status: r.status,
    quoteStatus: r.quote && typeof r.quote !== 'string' ? r.quote.status : 'no quote object',
    quoteRequested: r.quoteRequested,
    hasQuotedAmount: !!r.quotedAmount
  })));
  console.log('DashboardContent - Active Jobs:', filteredActiveJobs.length);
  console.log('DashboardContent - Completed Jobs:', filteredCompletedJobs.length);

  // Additional filtering to ensure we only show true quote requests that need contractor action
  const displayQuoteRequests = filteredQuoteRequests.filter(request => {
    // Only show requests where contractor needs to submit a quote
    if (request.quote && typeof request.quote !== 'string') {
      const needsQuote = request.quote.status === 'requested';
      console.log(`DashboardContent - Request ${request.id.substring(0, 8)}: quote status = ${request.quote.status}, needs quote = ${needsQuote}`);
      return needsQuote;
    }
    
    // Legacy support: show requests where quoteRequested is true but no quote object exists
    const isLegacyRequest = request.quoteRequested === true && !request.quotedAmount && !request.quote;
    console.log(`DashboardContent - Request ${request.id.substring(0, 8)}: legacy request = ${isLegacyRequest}`);
    return isLegacyRequest;
  });

  console.log('DashboardContent - Final display quote requests:', displayQuoteRequests.length);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 space-y-6">
        <ContractorMetrics 
          pendingQuotes={displayQuoteRequests}
          activeJobs={filteredActiveJobs}
          completedJobs={filteredCompletedJobs}
          loading={loading}
        />
        
        <Card className="p-6">
          <h2 className="font-semibold text-lg mb-4">Quote Requests ({displayQuoteRequests.length})</h2>
          <RequestsTable 
            requests={displayQuoteRequests} 
            onSelectRequest={onSelectRequest}
            filterQuoteRequests={true}
          />
        </Card>
        
        <Card className="p-6">
          <h2 className="font-semibold text-lg mb-4">Jobs</h2>
          <Tabs defaultValue="active">
            <TabsList className="mb-4">
              <TabsTrigger value="active">
                Active Jobs ({filteredActiveJobs.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({filteredCompletedJobs.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="active">
              <RequestsTable 
                requests={filteredActiveJobs}
                onSelectRequest={onSelectRequest}
                filterQuoteRequests={false}
              />
            </TabsContent>
            
            <TabsContent value="completed">
              <RequestsTable 
                requests={filteredCompletedJobs} 
                onSelectRequest={onSelectRequest}
                filterQuoteRequests={false}
              />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
      
      <div className="space-y-6">
        <QuickActionsCard />
      </div>
    </div>
  );
};
