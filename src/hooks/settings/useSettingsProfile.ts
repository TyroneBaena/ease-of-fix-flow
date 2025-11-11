/**
 * v80.1 - React Query hook for Profile fetching in Settings
 * 
 * SOLVES: Profiles API not running on tab revisit when on User/Contractor Management
 * 
 * This hook fetches the current user's profile and automatically refetches
 * when the user returns to the tab (refetchOnWindowFocus: true).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/user';

interface UseSettingsProfileOptions {
  enabled: boolean; // Only fetch when on User/Contractor Management pages
  userId?: string; // Current user's ID
}

export const useSettingsProfile = ({ enabled, userId }: UseSettingsProfileOptions) => {
  const query = useQuery({
    queryKey: ['settings-profile', userId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      console.log('👤 v80.1 - useSettingsProfile: Fetching profile via React Query for user:', userId);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ v80.1 - Profile fetch error:', error);
        throw error;
      }

      console.log('👤 v80.1 - useSettingsProfile: Profile fetched successfully');
      return profile;
    },
    enabled: enabled && !!userId,
    // CRITICAL: Refetch on window focus to solve tab revisit issue
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale - refetch on every window focus
    gcTime: 5 * 60 * 1000, // 5 minutes cache time
    retry: 2,
  });

  return {
    profile: query.data,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
};
