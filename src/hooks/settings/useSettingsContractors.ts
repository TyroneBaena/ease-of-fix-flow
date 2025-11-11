/**
 * v80.0 - React Query hook for Contractor Management
 * 
 * SOLVES TWO CRITICAL ISSUES:
 * 1. Multiple API calls on tab click - React Query's deduplication prevents simultaneous fetches
 * 2. No fetch on tab return - React Query's refetchOnWindowFocus automatically refetches
 * 
 * This hook is ONLY used by Contractor Management component in Settings.
 */

import { useQuery } from '@tanstack/react-query';
import { fetchContractors } from '@/components/settings/contractor-management/operations/contractorFetch';
import { Contractor } from '@/types/contractor';

interface UseSettingsContractorsOptions {
  enabled: boolean; // Only fetch when user is admin
}

export const useSettingsContractors = ({ enabled }: UseSettingsContractorsOptions) => {
  const query = useQuery<Contractor[], Error>({
    queryKey: ['settings-contractors'],
    queryFn: async () => {
      console.log('🏗️ v80.0 - useSettingsContractors: Fetching contractors via React Query');
      const contractors = await fetchContractors();
      console.log('🏗️ v80.0 - useSettingsContractors: Fetched', contractors.length, 'contractors');
      return contractors;
    },
    enabled,
    // CRITICAL: These settings solve both issues
    refetchOnWindowFocus: true, // ✅ Solves: No fetch on tab return
    staleTime: 30000, // 30s - Consider data stale after this time
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
    retry: 2,
  });

  return {
    contractors: query.data || [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
};
