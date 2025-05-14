
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook to check if the current user is a contractor
 */
export function useContractorStatus(userId: string | undefined): boolean {
  const [isContractor, setIsContractor] = useState(false);

  useEffect(() => {
    if (!userId) return;
    
    const checkContractorStatus = async () => {
      try {
        // First check if user is a contractor in profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
          
        if (profileData?.role === 'contractor') {
          setIsContractor(true);
          return;
        }
        
        // Then check if there's a contractor record for this user
        const { data: contractorData, error } = await supabase
          .from('contractors')
          .select('id')
          .eq('user_id', userId);
          
        setIsContractor(!error && contractorData && contractorData.length > 0);
      } catch (err) {
        console.error('Error checking contractor status:', err);
        setIsContractor(false);
      }
    };
    
    checkContractorStatus();
  }, [userId]);

  return isContractor;
}
