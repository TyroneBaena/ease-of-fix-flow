
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
    if (!currentUser) return;

    const fetchContractorId = async () => {
      try {
        console.log('Fetching contractor ID for user:', currentUser.id);
        const { data, error } = await supabase
          .from('contractors')
          .select('id')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setContractorId(data.id);
          console.log('Found contractor ID:', data.id);
        } else {
          console.log('No contractor found for this user');
          setError('No contractor profile found for this user');
          toast.error('No contractor profile found for this account');
        }
      } catch (err) {
        console.error('Error fetching contractor ID:', err);
        setError('Could not verify contractor status');
        toast.error('Error loading contractor information');
      } finally {
        setLoading(false);
      }
    };

    fetchContractorId();
  }, [currentUser]);

  return { contractorId, setContractorId, loading, setLoading, error, setError };
};
