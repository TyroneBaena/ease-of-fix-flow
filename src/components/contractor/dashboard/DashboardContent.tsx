
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
  console.log('DashboardContent - Raw Quote Requests received:', filteredQuoteRequests.length);
  console.log('DashboardContent - Raw Quote Requests data:', filteredQuoteRequests.map(r => ({
    id: r.id.substring(0, 8),
    title: r.title,
    status: r.status,
    quoteStatus: r.quote && typeof r.quote !== 'string' ? r.quote.status : 'no quote object',
    quoteRequested: r.quoteRequested,
    hasQuotedAmount: !!r.quotedAmount
  })));

  // STRICT filtering to ensure ONLY quote requests that need contractor quotes are shown
  // Exclude ANY in-progress, completed, or other job statuses
  const displayQuoteRequests = filteredQuoteRequests.filter(request => {
    // FIRST: Exclude any in-progress or completed jobs - these should NEVER be in quote requests
    if (request.status === 'in-progress' || request.status === 'completed') {
      console.log(`DashboardContent - EXCLUDING ${request.id.substring(0, 8)}: status is ${request.status} (not a quote request)`);
      return false;
    }

    // SECOND: Only include requests with 'pending' or 'open' status that need quotes
    if (request.status !== 'pending' && request.status !== 'open') {
      console.log(`DashboardContent - EXCLUDING ${request.id.substring(0, 8)}: status is ${request.status} (not pending/open)`);
      return false;
    }

    // THIRD: Check if contractor needs to submit a quote
    if (request.quote && typeof request.quote !== 'string') {
      const needsQuote = request.quote.status === 'requested';
      console.log(`DashboardContent - Request ${request.id.substring(0, 8)}: quote status = ${request.quote.status}, needs quote = ${needsQuote}`);
      return needsQuote;
    }
    
    // FOURTH: Legacy support - show requests where quoteRequested is true but no quote object exists
    const isLegacyRequest = request.quoteRequested === true && !request.quotedAmount && !request.quote;
    console.log(`DashboardContent - Request ${request.id.substring(0, 8)}: legacy request = ${isLegacyRequest}`);
    return isLegacyRequest;
  });

  console.log('DashboardContent - Final QUOTE REQUESTS (after strict filtering):', displayQuoteRequests.length);
  console.log('DashboardContent - Final ACTIVE JOBS:', filteredActiveJobs.length);
  console.log('DashboardContent - Final COMPLETED JOBS:', filteredCompletedJobs.length);

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
