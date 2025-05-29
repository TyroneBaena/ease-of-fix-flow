
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Contractor } from '@/types/contractor';

export const createContractor = async (newContractor: Partial<Contractor>) => {
  try {
    // First check if this email already exists as a contractor
    const { data: existingContractors, error: checkError } = await supabase
      .from('contractors')
      .select('*')
      .eq('email', newContractor.email)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing contractor:", checkError);
      throw checkError;
    }

    if (existingContractors) {
      toast.error(`A contractor with email ${newContractor.email} already exists`);
      return false;
    }

    // Proceed with contractor invitation
    const { data, error } = await supabase.functions.invoke('invite-contractor', {
      body: {
        email: newContractor.email,
        companyName: newContractor.companyName,
        contactName: newContractor.contactName,
        phone: newContractor.phone,
        address: newContractor.address || null,
        specialties: newContractor.specialties || []
      }
    });
    
    if (error) {
      console.error("Edge function error:", error);
      throw error;
    }
    
    if (data?.success) {
      toast.success(`Invitation sent to ${newContractor.email}`);
      
      if (data.testMode) {
        toast.info('Note: Email was sent in test mode');
      }
      
      if (!data.emailSent && data.emailError) {
        toast.warning(`Contractor created but email failed: ${data.emailError}`);
      }
      
      return true;
    } else {
      throw new Error(data?.message || 'Failed to invite contractor');
    }
  } catch (error: any) {
    console.error("Error creating contractor:", error);
    
    // Check if the error is about existing user and handle it appropriately
    if (error.message?.includes('already exists')) {
      toast.error(`A contractor with email ${newContractor.email} already exists. Please use a different email address.`);
    } else {
      toast.error(`Failed to invite contractor: ${error.message || 'Unknown error'}`);
    }
    return false;
  }
};
