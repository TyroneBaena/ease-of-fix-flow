import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string | null;
  assigned_properties: string[] | null;
  organization_id: string | null;
  session_organization_id: string | null;
  notification_settings: any | null;
  created_at: string | null;
  updated_at: string | null;
}

export const useUserProfile = () => {
  const { currentUser } = useSimpleAuth();
  const userId = currentUser?.id;

  return useQuery({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');

      console.log('🔍 Fetching full user profile for:', userId);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Profile fetch error:', error);
        throw error;
      }

      console.log('✅ Full profile fetched successfully:', data);
      return data as UserProfile;
    },
    enabled: !!userId, // Only run query if we have a user ID
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: true, // Override global setting - refetch on tab revisit
    refetchOnMount: true, // Refetch when component mounts
    retry: 2, // Retry failed requests twice
  });
};
