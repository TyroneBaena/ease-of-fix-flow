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
        // If no settings exist yet, return null
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    }
  });
};
