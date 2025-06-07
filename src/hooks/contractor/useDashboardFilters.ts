
import { useMemo } from 'react';
import { MaintenanceRequest } from '@/types/maintenance';

interface UseDashboardFiltersProps {
  pendingQuoteRequests: MaintenanceRequest[];
  activeJobs: MaintenanceRequest[];
  completedJobs: MaintenanceRequest[];
}

export const useDashboardFilters = ({
  pendingQuoteRequests,
  activeJobs,
  completedJobs
}: UseDashboardFiltersProps) => {
  // Filter quote requests to show all relevant quote stages:
  // 1. 'requested' - contractor needs to submit a quote
  // 2. 'pending' - quote submitted by contractor, waiting for admin review
  // 3. 'submitted' - quote under admin review
  const filteredQuoteRequests = useMemo(() => {
    console.log('Dashboard Filters - Raw pending quote requests:', pendingQuoteRequests);
    
    const filtered = pendingQuoteRequests.filter(request => {
      // Include requests with quote objects in various statuses
      if (request.quote && typeof request.quote !== 'string') {
        const includeStatuses = ['requested', 'pending', 'submitted'];
        const shouldInclude = includeStatuses.includes(request.quote.status);
        console.log(`Request ${request.id}: quote status = ${request.quote.status}, including = ${shouldInclude}`);
        return shouldInclude;
      }
      
      // Legacy support: show requests where quoteRequested is true but no quote object exists yet
      const isLegacyRequest = request.quoteRequested === true && !request.quotedAmount && !request.quote;
      console.log(`Request ${request.id}: legacy request = ${isLegacyRequest}`);
      return isLegacyRequest;
    });
    
    console.log('Dashboard Filters - Filtered quote requests count:', filtered.length);
    return filtered;
  }, [pendingQuoteRequests]);

  // Filter active jobs to only show jobs that are actually in progress with approved quotes
  // These should NOT appear in quote requests section
  const filteredActiveJobs = useMemo(() => {
    return activeJobs.filter(request => {
      // Only show jobs that are in 'in-progress' status AND have approved quotes
      if (request.status === 'in-progress') {
        // Check if it has an approved quote
        if (request.quote && typeof request.quote !== 'string') {
          return request.quote.status === 'approved';
        }
        // Or if it has a quoted amount (legacy data)
        return request.quotedAmount !== undefined && request.quotedAmount !== null;
      }
      return false;
    });
  }, [activeJobs]);

  // Filter completed jobs to only show jobs that are completed and had quotes
  const filteredCompletedJobs = useMemo(() => {
    return completedJobs.filter(request => {
      const hasQuote = request.quotedAmount || 
                      (request.quote && typeof request.quote !== 'string' && request.quote.amount);
      return hasQuote && request.status === 'completed';
    });
  }, [completedJobs]);

  console.log('Dashboard Filters - Final Results:');
  console.log('- Quote Requests:', filteredQuoteRequests.length);
  console.log('- Active Jobs:', filteredActiveJobs.length);
  console.log('- Completed Jobs:', filteredCompletedJobs.length);

  return {
    filteredQuoteRequests,
    filteredActiveJobs,
    filteredCompletedJobs
  };
};
