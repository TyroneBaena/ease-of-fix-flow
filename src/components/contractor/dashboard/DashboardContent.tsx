
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
  console.log('DashboardContent - Quote Requests:', filteredQuoteRequests);
  console.log('DashboardContent - Active Jobs:', filteredActiveJobs);
  console.log('DashboardContent - Completed Jobs:', filteredCompletedJobs);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 space-y-6">
        <ContractorMetrics 
          pendingQuotes={filteredQuoteRequests}
          activeJobs={filteredActiveJobs}
          completedJobs={filteredCompletedJobs}
          loading={loading}
        />
        
        <Card className="p-6">
          <h2 className="font-semibold text-lg mb-4">Quote Requests ({filteredQuoteRequests.length})</h2>
          <RequestsTable 
            requests={filteredQuoteRequests} 
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
