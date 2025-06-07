
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
        
        // First, let's check if we can access the contractors table at all
        console.log('Testing basic contractors table access...');
        
        // Use the security definer function instead of direct table access
        const { data: contractorIdFromFunction, error: functionError } = await supabase
          .rpc('get_contractor_id');
          
        if (functionError) {
          console.error('Error calling get_contractor_id function:', functionError);
          // Fallback to direct table query if function fails
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
            console.log('Found contractor ID via direct query:', data.id);
            toast.success('Contractor profile loaded successfully');
          } else {
            console.log('No contractor profile found for this user');
            setError('No contractor profile found for this user');
            toast.error('No contractor profile found for this account. Please contact your administrator.');
          }
        } else {
          if (contractorIdFromFunction) {
            setContractorId(contractorIdFromFunction);
            console.log('Found contractor ID via function:', contractorIdFromFunction);
            toast.success('Contractor profile loaded successfully');
          } else {
            console.log('No contractor profile found for this user (via function)');
            setError('No contractor profile found for this user');
            toast.error('No contractor profile found for this account. Please contact your administrator.');
          }
        }
      } catch (err: any) {
        console.error('Error fetching contractor ID:', err);
        
        // More specific error handling
        if (err.message?.includes('infinite recursion')) {
          const errorMessage = 'Database configuration issue. Please contact your administrator.';
          setError(errorMessage);
          toast.error('System configuration error. Please try refreshing the page or contact support.');
        } else if (err.code === 'PGRST116') {
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
