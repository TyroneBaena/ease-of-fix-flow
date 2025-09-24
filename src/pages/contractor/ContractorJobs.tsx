
import React from 'react';
import { ContractorHeader } from '@/components/contractor/ContractorHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { RequestsTable } from '@/components/contractor/requests/RequestsTable';
import { useContractorAuth } from '@/contexts/contractor/ContractorAuthContext';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Toaster } from "sonner";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import ContractorJobFilters from '@/components/contractor/requests/ContractorJobFilters';
import { useContractorJobFilters } from '@/hooks/contractor/useContractorJobFilters';

const ContractorJobs = () => {
  const { 
    activeJobs, 
    completedJobs, 
    loading, 
    error,
    refreshData,
    contractorId
  } = useContractorAuth();

  // Combine all jobs for comprehensive filtering
  const allJobs = [...(activeJobs || []), ...(completedJobs || [])];
  
  // Set up filtering for all jobs
  const {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    siteFilter,
    setSiteFilter,
    priorityFilter,
    setPriorityFilter,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    categories,
    sites,
    filteredJobs
  } = useContractorJobFilters(allJobs);

  // Separate filtered jobs back into active and completed
  const filteredActiveJobs = filteredJobs.filter(job => 
    job.status === 'pending' || job.status === 'open' || job.status === 'in-progress'
  );
  
  const filteredCompletedJobs = filteredJobs.filter(job => 
    job.status === 'completed' || job.status === 'cancelled'
  );

  console.log('ContractorJobs - Current data state:', {
    contractorId,
    activeJobsCount: activeJobs?.length || 0,
    completedJobsCount: completedJobs?.length || 0,
    filteredActiveJobsCount: filteredActiveJobs.length,
    filteredCompletedJobsCount: filteredCompletedJobs.length,
    loading,
    error,
    totalFiltered: filteredJobs.length,
    filtersActive: {
      search: !!searchTerm,
      status: statusFilter !== 'all',
      category: categoryFilter !== 'all',
      site: siteFilter !== 'all',
      priority: priorityFilter !== 'all',
      
    }
  });

  const handleRefresh = () => {
    refreshData();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ContractorHeader />
      <Toaster position="bottom-right" richColors />
      <main className="container mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">All Jobs</h1>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            className="flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <ContractorJobFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              siteFilter={siteFilter}
              setSiteFilter={setSiteFilter}
              priorityFilter={priorityFilter}
              setPriorityFilter={setPriorityFilter}
              sortField={sortField}
              setSortField={setSortField}
              sortDirection={sortDirection}
              setSortDirection={setSortDirection}
              categories={categories}
              sites={sites}
            />
            
            <Card className="p-6">
              <Tabs defaultValue="active">
                <TabsList className="mb-4">
                  <TabsTrigger value="active">
                    Active Jobs ({filteredActiveJobs.length})
                    {filteredActiveJobs.length !== (activeJobs?.length || 0) && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        / {activeJobs?.length || 0}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="completed">
                    Completed ({filteredCompletedJobs.length})
                    {filteredCompletedJobs.length !== (completedJobs?.length || 0) && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        / {completedJobs?.length || 0}
                      </span>
                    )}
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="active">
                  <RequestsTable 
                    requests={filteredActiveJobs} 
                    onSelectRequest={(request) => {
                      window.location.href = `/contractor-jobs/${request.id}`;
                    }}
                    filterQuoteRequests={false}
                  />
                </TabsContent>
                
                <TabsContent value="completed">
                  <RequestsTable 
                    requests={filteredCompletedJobs}
                    onSelectRequest={(request) => {
                      window.location.href = `/contractor-jobs/${request.id}`;
                    }}
                    filterQuoteRequests={false}
                  />
                </TabsContent>
              </Tabs>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default ContractorJobs;
