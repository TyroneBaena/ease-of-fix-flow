/**
 * v80.0 - React Query hook for User Management
 * 
 * SOLVES TWO CRITICAL ISSUES:
 * 1. Multiple API calls on tab click - React Query's deduplication prevents simultaneous fetches
 * 2. No fetch on tab return - React Query's refetchOnWindowFocus automatically refetches
 * 
 * This hook is ONLY used by User Management component in Settings.
 * Other pages continue using the existing UserContext.
 */

import { useQuery } from '@tanstack/react-query';
import { userService } from '@/services/userService';
import { User } from '@/types/user';

interface UseSettingsUsersOptions {
  enabled: boolean; // Only fetch when user is admin/manager
}

export const useSettingsUsers = ({ enabled }: UseSettingsUsersOptions) => {
  const query = useQuery<User[], Error>({
    queryKey: ['settings-users'],
    queryFn: async () => {
      console.log('👥 v80.0 - useSettingsUsers: Fetching users via React Query');
      const users = await userService.getAllUsers();
      console.log('👥 v80.0 - useSettingsUsers: Fetched', users.length, 'users');
      return users;
    },
    enabled,
    // CRITICAL: These settings solve both issues
    refetchOnWindowFocus: true, // ✅ Solves: No fetch on tab return
    staleTime: 0, // Always consider data stale - refetch on every window focus
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
    retry: 2,
  });

  return {
    users: query.data || [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
};
