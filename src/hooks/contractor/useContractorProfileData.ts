
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from '@/lib/toast';

interface ContractorProfile {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address?: string;
  specialties?: string[];
  createdAt: string;
  jobsCompleted: number;
  rating: number;
  accountStatus: 'active' | 'inactive';
}

export const useContractorProfileData = () => {
  const { currentUser } = useUserContext();
  const [contractor, setContractor] = useState<ContractorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'contractor') {
      setLoading(false);
      return;
    }

    const fetchContractorProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch contractor data
        const { data: contractorData, error: contractorError } = await supabase
          .from('contractors')
          .select('*')
          .eq('user_id', currentUser.id)
          .single();

        if (contractorError) throw contractorError;

        // Fetch completed jobs count
        const { data: jobsData, error: jobsError } = await supabase
          .from('maintenance_requests')
          .select('id')
          .eq('contractor_id', contractorData.id)
          .eq('status', 'completed');

        if (jobsError) throw jobsError;

        // Calculate rating (mock for now, could be based on feedback in the future)
        const rating = 4.8; // This could be calculated from feedback/reviews

        const profile: ContractorProfile = {
          id: contractorData.id,
          companyName: contractorData.company_name,
          contactName: contractorData.contact_name,
          email: contractorData.email,
          phone: contractorData.phone,
          address: contractorData.address,
          specialties: contractorData.specialties || [],
          createdAt: contractorData.created_at,
          jobsCompleted: jobsData?.length || 0,
          rating: rating,
          accountStatus: 'active' // This could be a field in the database
        };

        setContractor(profile);
      } catch (err) {
        console.error('Error fetching contractor profile:', err);
        setError('Failed to load contractor profile');
        toast.error('Could not load profile information');
      } finally {
        setLoading(false);
      }
    };

    fetchContractorProfile();
  }, [currentUser]);

  return { contractor, loading, error, refetch: () => window.location.reload() };
};
