
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
      // CRITICAL FIX: Add timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn('Contractor status check timeout after 10s');
      }, 10000);

      try {
        // First check if user is a contractor in profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        clearTimeout(timeoutId);
          
        if (profileData?.role === 'contractor') {
          setIsContractor(true);
          return;
        }
        
        // Then check if there's a contractor record for this user
        const checkTimeoutId = setTimeout(() => controller.abort(), 10000);
        const { data: contractorData, error } = await supabase
          .from('contractors')
          .select('id')
          .eq('user_id', userId);

        clearTimeout(checkTimeoutId);
          
        setIsContractor(!error && contractorData && contractorData.length > 0);
      } catch (err) {
        clearTimeout(timeoutId);
        
        if (controller.signal.aborted) {
          console.warn('Contractor status check aborted due to timeout');
        } else {
          console.error('Error checking contractor status:', err);
        }
        setIsContractor(false);
      }
    };
    
    checkContractorStatus();
  }, [userId]);

  return isContractor;
}
