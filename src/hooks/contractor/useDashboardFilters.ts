
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
  // Filter quote requests to only show requests that need quotes to be submitted
  const filteredQuoteRequests = useMemo(() => {
    return pendingQuoteRequests.filter(request => {
      // Only show requests where quotes are requested but not yet submitted or are in 'requested' status
      if (request.quote && typeof request.quote !== 'string') {
        // Show if quote status is 'requested' (waiting for contractor to submit quote)
        return request.quote.status === 'requested';
      }
      // Also include requests where quoteRequested is true but no quote object exists yet
      return request.quoteRequested === true && !request.quotedAmount;
    });
  }, [pendingQuoteRequests]);

  // Filter active jobs to only show jobs that are actually in progress (not just quote submissions)
  const filteredActiveJobs = useMemo(() => {
    return activeJobs.filter(request => {
      // Only show jobs that are in 'in-progress' status and have approved quotes
      if (request.status === 'in-progress') {
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

  console.log('Dashboard Filters - Pending Quote Requests (raw):', pendingQuoteRequests);
  console.log('Dashboard Filters - Filtered Quote Requests:', filteredQuoteRequests.length);
  console.log('Dashboard Filters - Active Jobs:', filteredActiveJobs.length);
  console.log('Dashboard Filters - Completed Jobs:', filteredCompletedJobs.length);

  return {
    filteredQuoteRequests,
    filteredActiveJobs,
    filteredCompletedJobs
  };
};
