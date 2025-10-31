import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAppSettings = () => {
  return useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .single();

      if (error) {
        // If no settings exist yet, return empty object
        if (error.code === 'PGRST116') {
          return {};
        }
        throw error;
      }

      // Note: google_maps_api_key has been removed for security
      // API keys should only be in environment variables
      return data || {};
    }
  });
};
