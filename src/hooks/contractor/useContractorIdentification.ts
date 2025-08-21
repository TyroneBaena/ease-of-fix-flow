
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
        
        // First verify user authentication
        if (!currentUser.id) {
          throw new Error('User not authenticated');
        }
        
        // Query contractor profile with better error handling
        const { data, error } = await supabase
          .from('contractors')
          .select('id, company_name, contact_name')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (error) {
          console.error('Database error fetching contractor ID:', error);
          throw error;
        }
        
        if (data) {
          setContractorId(data.id);
          console.log('Found contractor profile:', {
            contractorId: data.id,
            companyName: data.company_name,
            contactName: data.contact_name
          });
          toast.success(`Welcome, ${data.contact_name}! Profile loaded successfully.`);
        } else {
          console.log('No contractor profile found for user:', currentUser.id);
          const errorMessage = 'No contractor profile found. Please contact your administrator to set up your contractor account.';
          setError(errorMessage);
          toast.error(errorMessage);
        }
      } catch (err: any) {
        console.error('Error fetching contractor ID:', err);
        
        let errorMessage = 'Unable to load contractor profile';
        
        if (err.code === 'PGRST116' || err.code === '42501') {
          errorMessage = 'Access denied. Please ensure you have contractor permissions.';
        } else if (err.message === 'User not authenticated') {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (err.code === 'NETWORK_ERROR') {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
        
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchContractorId();
  }, [currentUser]);

  return { contractorId, setContractorId, loading, setLoading, error, setError };
};
