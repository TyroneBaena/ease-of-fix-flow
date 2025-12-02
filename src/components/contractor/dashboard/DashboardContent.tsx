
import React from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContractorMetrics } from '@/components/contractor/dashboard/ContractorMetrics';
import { RequestsTable } from '@/components/contractor/requests/RequestsTable';
import QuickActionsCard from './QuickActionsCard';
import { ContractorCalendarWidget } from '@/components/contractor/ContractorCalendarWidget';
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
  // Force re-render check by adding a key based on data
  const dataKey = React.useMemo(() => {
    return `${filteredQuoteRequests.length}-${filteredActiveJobs.length}-${filteredCompletedJobs.length}-${Date.now()}`;
  }, [filteredQuoteRequests.length, filteredActiveJobs.length, filteredCompletedJobs.length]);

  // Debug dashboard content state
  console.log('🔍 DEBUG: DashboardContent - Props received (render key:', dataKey, '):', {
    activeJobsFromProps: filteredActiveJobs.length,
    activeJobStatuses: filteredActiveJobs.map(j => ({ 
      id: j.id?.substring(0, 8), 
      status: j.status, 
      title: j.title 
    })),
    completedJobsFromProps: filteredCompletedJobs.length,
    quoteRequestsFromProps: filteredQuoteRequests.length
  });
  console.log('🔍 DEBUG: DashboardContent - Raw Quote Requests received:', filteredQuoteRequests.length);
  console.log('🔍 DEBUG: DashboardContent - Raw Quote Requests data:', filteredQuoteRequests.map(r => ({
    id: r.id.substring(0, 8),
    title: r.title,
    status: r.status,
    quoteStatus: r.quote && typeof r.quote !== 'string' ? r.quote.status : 'no quote object',
    quoteRequested: r.quoteRequested,
    hasQuotedAmount: !!r.quotedAmount
  })));

  // Filter to show quote requests in various stages:
  // 1. Pending - contractor needs to submit a quote
  // 2. Quote submitted - contractor has submitted, waiting for admin
  // 3. Admin approval pending - quote is under review
  const displayQuoteRequests = filteredQuoteRequests.filter(request => {
    // Exclude any in-progress or completed jobs - these should be in other sections
    if (request.status === 'in-progress' || request.status === 'completed') {
      console.log(`DashboardContent - EXCLUDING ${request.id.substring(0, 8)}: status is ${request.status} (not a quote request)`);
      return false;
    }

    // Include requests with quote objects in relevant statuses
    if (request.quote && typeof request.quote !== 'string') {
      const includeStatuses = ['requested', 'pending', 'submitted'];
      const shouldInclude = includeStatuses.includes(request.quote.status);
      console.log(`DashboardContent - Request ${request.id.substring(0, 8)}: quote status = ${request.quote.status}, include = ${shouldInclude}`);
      return shouldInclude;
    }
    
    // Legacy support - show requests where quoteRequested is true but no quote object exists
    const isLegacyRequest = request.quoteRequested === true && !request.quotedAmount && !request.quote;
    console.log(`DashboardContent - Request ${request.id.substring(0, 8)}: legacy request = ${isLegacyRequest}`);
    return isLegacyRequest;
  });

  // Just use the filtered jobs directly - no additional filtering needed since 
  // the filtering should happen in useDashboardFilters
  const displayActiveJobs = filteredActiveJobs;
  const displayCompletedJobs = filteredCompletedJobs;

  console.log('DashboardContent - Raw filteredActiveJobs received:', filteredActiveJobs.map(r => ({
    id: r.id.substring(0, 8),
    title: r.title,
    status: r.status,
    contractorId: r.contractorId
  })));

  console.log('DashboardContent - Final QUOTE REQUESTS (after filtering):', displayQuoteRequests.length);
  console.log('DashboardContent - Final ACTIVE JOBS (after table filtering):', displayActiveJobs.length);
  console.log('DashboardContent - Final COMPLETED JOBS (after table filtering):', displayCompletedJobs.length);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" key={dataKey}>
      <div className="lg:col-span-3 space-y-6">
        <ContractorMetrics 
          key={`metrics-${dataKey}`}
          pendingQuotes={displayQuoteRequests}
          activeJobs={displayActiveJobs}
          completedJobs={displayCompletedJobs}
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
                Active Jobs ({displayActiveJobs.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({displayCompletedJobs.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="active">
              <RequestsTable 
                requests={displayActiveJobs}
                onSelectRequest={onSelectRequest}
                filterQuoteRequests={false}
              />
            </TabsContent>
            
            <TabsContent value="completed">
              <RequestsTable 
                requests={displayCompletedJobs} 
                onSelectRequest={onSelectRequest}
                filterQuoteRequests={false}
              />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
      
      <div className="space-y-6">
        <ContractorCalendarWidget />
        <QuickActionsCard />
      </div>
    </div>
  );
};
