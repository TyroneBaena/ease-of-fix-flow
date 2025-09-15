
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

  // Filter active jobs to show all jobs that are in-progress status
  // These are jobs assigned to the contractor, regardless of quote status
  const filteredActiveJobs = useMemo(() => {
    console.log('Dashboard Filters - RAW activeJobs array:', activeJobs);
    console.log('Dashboard Filters - Raw active jobs count:', activeJobs.length);
    console.log('Dashboard Filters - Raw active jobs with status check:', activeJobs.map(r => ({
      id: r.id?.substring(0, 8) || 'no-id',
      title: r.title,
      status: r.status,
      contractorId: r.contractorId
    })));
    
    const filtered = activeJobs.filter(request => {
      // Show all jobs that are in 'in-progress' status (data mapper converts in_progress to in-progress)
      // This includes both assigned jobs and jobs with approved quotes
      const isActive = request.status === 'in-progress';
      console.log(`Dashboard Filters - Job ${request.id?.substring(0, 8) || 'no-id'}: status=${request.status}, isActive=${isActive}`);
      return isActive;
    });
    
    console.log('Dashboard Filters - Filtered active jobs result:', filtered);
    return filtered;
  }, [activeJobs]);

  // Filter completed jobs to show all completed jobs (consistent with Jobs tab)
  const filteredCompletedJobs = useMemo(() => {
    console.log('Dashboard Filters - Raw completed jobs:', completedJobs.length);
    const filtered = completedJobs.filter(request => request.status === 'completed');
    console.log('Dashboard Filters - Filtered completed jobs:', filtered.length);
    return filtered;
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
