
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from '@/lib/toast';

export const useContractorIdentification = () => {
  const { currentUser } = useUserContext();
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const fetchContractorId = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching contractor ID for user:', currentUser.id);
        
        // Now that RLS policies are fixed, we can use direct table queries
        const { data, error } = await supabase
          .from('contractors')
          .select('id')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (error) {
          console.error('Database error fetching contractor ID:', error);
          throw error;
        }
        
        if (data) {
          setContractorId(data.id);
          console.log('Found contractor ID:', data.id);
          toast.success('Contractor profile loaded successfully');
        } else {
          console.log('No contractor profile found for this user');
          setError('No contractor profile found for this user');
          toast.error('No contractor profile found for this account. Please contact your administrator.');
        }
      } catch (err: any) {
        console.error('Error fetching contractor ID:', err);
        
        if (err.code === 'PGRST116') {
          const errorMessage = 'Access denied. Please ensure you have the correct permissions.';
          setError(errorMessage);
          toast.error('You do not have permission to access contractor information.');
        } else {
          const errorMessage = 'Could not verify contractor status';
          setError(errorMessage);
          toast.error('Error loading contractor information. Please try refreshing the page.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchContractorId();
  }, [currentUser]);

  return { contractorId, setContractorId, loading, setLoading, error, setError };
};
