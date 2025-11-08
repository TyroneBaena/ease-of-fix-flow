
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Hook to check if the current user is a contractor
 * CRITICAL: Waits for session to be ready before querying
 */
export function useContractorStatus(userId: string | undefined, isSessionReady?: boolean): boolean {
  const [isContractor, setIsContractor] = useState(false);
  const previousSessionReadyRef = useRef(isSessionReady);

  useEffect(() => {
    // Smart Retry: Detect when isSessionReady transitions from false to true
    const sessionJustBecameReady = !previousSessionReadyRef.current && isSessionReady;
    previousSessionReadyRef.current = isSessionReady;
    
    // CRITICAL: Wait for session to be ready before querying
    if (!isSessionReady) {
      console.log('🔄 useContractorStatus - Waiting for session to be ready...');
      return;
    }
    
    if (sessionJustBecameReady) {
      console.log('✅ useContractorStatus - Session became ready, triggering check');
    }
    
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
  }, [userId, isSessionReady]); // Add isSessionReady to deps

  return isContractor;
}
