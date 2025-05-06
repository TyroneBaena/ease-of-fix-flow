
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

/**
 * Hook to check if the current user is a contractor
 */
export function useContractorStatus(userId: string | undefined) {
  const [isContractor, setIsContractor] = useState(false);
  
  useEffect(() => {
    if (!userId) return;
    
    const checkContractorStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('contractors')
          .select('id')
          .eq('user_id', userId)
          .single();
          
        if (!error && data) {
          console.log("useContractorStatus - User is a contractor:", data);
          setIsContractor(true);
        } else {
          console.log("useContractorStatus - User is not a contractor:", error);
          setIsContractor(false);
        }
      } catch (err) {
        console.error("useContractorStatus - Exception checking contractor status:", err);
        toast.error("Error checking user role");
        setIsContractor(false);
      }
    };
    
    checkContractorStatus();
  }, [userId]);

  return isContractor;
}
