
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

  const fetchContractorProfile = async () => {
    console.log('useContractorProfileData - fetchContractorProfile called');
    console.log('useContractorProfileData - currentUser:', currentUser);
    
    if (!currentUser) {
      console.log('useContractorProfileData - No currentUser found');
      setLoading(false);
      return;
    }
    
    if (currentUser.role !== 'contractor') {
      console.log('useContractorProfileData - User role is not contractor:', currentUser.role);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('useContractorProfileData - Starting fetch for user:', currentUser.id);
      console.log('useContractorProfileData - User role:', currentUser.role);
      console.log('useContractorProfileData - User organization:', currentUser.organization_id);

      // First check if contractor exists by email as well, in case user_id doesn't match
      const { data: contractorData, error: contractorError } = await supabase
        .from('contractors')
        .select('*')
        .or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (contractorError) {
        console.error('useContractorProfileData - Error fetching contractor data:', contractorError);
        console.error('useContractorProfileData - Error details:', {
          code: contractorError.code,
          message: contractorError.message,
          details: contractorError.details,
          hint: contractorError.hint
        });
        // Don't throw the error immediately, try to create a new contractor
        console.log('useContractorProfileData - Continuing to create contractor despite error');
      }

      // If no contractor profile exists, create one automatically
      if (!contractorData) {
        console.log('useContractorProfileData - No contractor profile found, creating one...');
        
        const newContractorData = {
          user_id: currentUser.id,
          email: currentUser.email,
          contact_name: currentUser.name || '',
          company_name: `${currentUser.name || 'Contractor'} Services`,
          phone: currentUser.phone || '',
          address: '',
          specialties: [],
          organization_id: currentUser.organization_id
        };

        const { data: createdContractor, error: createError } = await supabase
          .from('contractors')
          .insert(newContractorData)
          .select()
          .single();

        if (createError) {
          console.error('useContractorProfileData - Error creating contractor profile:', createError);
          setError('Failed to create contractor profile');
          return;
        }

        console.log('useContractorProfileData - Created new contractor profile:', createdContractor);
        
        // Use the newly created contractor data
        const contractorDataToUse = createdContractor;
        
        // Continue with the rest of the logic using the created contractor
        const { data: jobsData, error: jobsError } = await supabase
          .from('maintenance_requests')
          .select('id')
          .eq('contractor_id', contractorDataToUse.id)
          .eq('status', 'completed');

        if (jobsError) {
          console.error('useContractorProfileData - Error fetching jobs data:', jobsError);
        }

        const rating = 4.8;

        const profile: ContractorProfile = {
          id: contractorDataToUse.id,
          companyName: contractorDataToUse.company_name,
          contactName: contractorDataToUse.contact_name,
          email: contractorDataToUse.email,
          phone: contractorDataToUse.phone,
          address: contractorDataToUse.address,
          specialties: contractorDataToUse.specialties || [],
          createdAt: contractorDataToUse.created_at,
          jobsCompleted: jobsData?.length || 0,
          rating: rating,
          accountStatus: 'active'
        };

        console.log('useContractorProfileData - Final contractor profile object (newly created):', profile);
        setContractor(profile);
        return;
      }

      console.log('useContractorProfileData - Raw contractor data from database:', contractorData);

      // Fetch completed jobs count
      const { data: jobsData, error: jobsError } = await supabase
        .from('maintenance_requests')
        .select('id')
        .eq('contractor_id', contractorData.id)
        .eq('status', 'completed');

      if (jobsError) {
        console.error('useContractorProfileData - Error fetching jobs data:', jobsError);
        // Don't throw error for jobs, just log it
      }

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

      console.log('useContractorProfileData - Final contractor profile object:', profile);
      console.log('useContractorProfileData - Specialties array:', profile.specialties);
      
      setContractor(profile);
    } catch (err) {
      console.error('useContractorProfileData - Error in fetch process:', err);
      setError('Failed to load contractor profile');
      toast.error('Could not load profile information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('useContractorProfileData - useEffect triggered');
    console.log('useContractorProfileData - currentUser:', {
      id: currentUser?.id,
      email: currentUser?.email,
      role: currentUser?.role,
      organizationId: currentUser?.organization_id
    });
    fetchContractorProfile();
  }, [currentUser]);

  return { 
    contractor, 
    loading, 
    error, 
    refetch: fetchContractorProfile 
  };
};
