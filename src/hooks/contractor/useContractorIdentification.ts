
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
      console.log('useContractorIdentification - No current user, clearing state');
      setContractorId(null);
      setError(null);
      setLoading(false);
      return;
    }

    const fetchContractorId = async () => {
      try {
        // Prevent concurrent requests
        if (loading) {
          console.log('useContractorIdentification - Already loading, skipping');
          return;
        }

        setLoading(true);
        setError(null);
        
        console.log('useContractorIdentification - Fetching contractor ID for user:', currentUser.id);
        
        // First verify user authentication
        if (!currentUser.id) {
          throw new Error('User not authenticated');
        }
        
        // Query contractor profile with enhanced handling for duplicates
        const { data, error, count } = await supabase
          .from('contractors')
          .select('id, company_name, contact_name', { count: 'exact' })
          .eq('user_id', currentUser.id);

        if (error) {
          console.error('useContractorIdentification - Database error fetching contractor ID:', error);
          throw error;
        }
         
        if (data && data.length > 0) {
          // Handle multiple contractors by taking the first one
          const contractor = data[0];
          setContractorId(contractor.id);
          
          if (data.length > 1) {
            console.warn(`useContractorIdentification - Found ${data.length} contractor profiles for user ${currentUser.id}. Using the first one.`);
            toast.info(`Multiple contractor profiles found. Using: ${contractor.company_name}`);
          }
          
          console.log('useContractorIdentification - Found contractor profile:', {
            contractorId: contractor.id,
            companyName: contractor.company_name,
            contactName: contractor.contact_name,
            totalProfiles: data.length,
            userId: currentUser.id
          });
          toast.success(`Welcome, ${contractor.contact_name}! Profile loaded successfully.`);
        } else {
          console.log('useContractorIdentification - No contractor profile found for user:', currentUser.id);
          const errorMessage = 'No contractor profile found. Please contact your administrator to set up your contractor account.';
          setError(errorMessage);
          toast.error(errorMessage);
        }
      } catch (err: any) {
        console.error('useContractorIdentification - Error fetching contractor ID:', err);
        
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

    // Add a small delay to ensure authentication is stable
    const timeoutId = setTimeout(() => {
      fetchContractorId();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [currentUser?.id]); // Only depend on user ID, not the entire user object

  return { contractorId, setContractorId, loading, setLoading, error, setError };
};
