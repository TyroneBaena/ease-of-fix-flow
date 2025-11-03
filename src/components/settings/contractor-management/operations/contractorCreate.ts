
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { Contractor } from '@/types/contractor';

export const createContractor = async (newContractor: Partial<Contractor>) => {
  console.log('🚀 createContractor - Starting contractor creation', { email: newContractor.email });
  
  try {
    // CRITICAL: Validate session before making any requests
    console.log('🔐 createContractor - Checking session');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ createContractor - Session error:', sessionError);
      throw new Error('Authentication error. Please try logging out and back in.');
    }
    
    if (!session) {
      console.error('❌ createContractor - No active session');
      throw new Error('No active session. Please log in again.');
    }
    
    console.log('✅ createContractor - Session validated');
    
    // First check if this email already exists as a contractor
    console.log('🔍 createContractor - Checking for existing contractor');
    const { data: existingContractors, error: checkError } = await supabase
      .from('contractors')
      .select('*')
      .eq('email', newContractor.email)
      .maybeSingle();

    if (checkError) {
      console.error("❌ createContractor - Error checking existing contractor:", checkError);
      throw checkError;
    }

    if (existingContractors) {
      console.log('⚠️ createContractor - Contractor already exists');
      toast.error(`A contractor with email ${newContractor.email} already exists`);
      return false;
    }

    // Proceed with contractor invitation
    console.log('📧 createContractor - Invoking edge function');
    const invocationBody = {
      email: newContractor.email,
      companyName: newContractor.companyName,
      contactName: newContractor.contactName,
      phone: newContractor.phone,
      address: newContractor.address || null,
      specialties: newContractor.specialties || []
    };
    
    console.log('📦 createContractor - Invocation body:', invocationBody);
    
    // Add timeout protection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error('⏱️ createContractor - Edge function timeout after 30s');
    }, 30000);
    
    try {
      const { data, error } = await supabase.functions.invoke('invite-contractor', {
        body: invocationBody
      });
      
      clearTimeout(timeoutId);
      console.log('📨 createContractor - Edge function response:', { data, error });
      
      if (error) {
        console.error("❌ createContractor - Edge function error:", error);
        throw error;
      }
      
      if (data?.success) {
        console.log('✅ createContractor - Contractor created successfully');
        // Always show success message for contractor creation
        toast.success(`Contractor created successfully`);
        
        // Handle email status separately
        if (data.emailSent) {
          if (data.testMode) {
            toast.info('Note: Invitation email sent to admin email (test mode). To send emails directly to contractors, verify your domain at resend.com/domains');
          } else {
            toast.success(`Invitation email sent to ${newContractor.email}`);
          }
        } else {
          toast.warning(`Contractor created but email failed: ${data.emailError || 'Email service not configured'}`);
        }
        
        return true;
      } else {
        throw new Error(data?.message || 'Failed to invite contractor');
      }
    } catch (invocationError) {
      clearTimeout(timeoutId);
      throw invocationError;
    }
  } catch (error: any) {
    console.error("❌ createContractor - Error creating contractor:", error);
    
    // Check if the error is about existing user and handle it appropriately
    if (error.message?.includes('already exists')) {
      toast.error(`A contractor with email ${newContractor.email} already exists. Please use a different email address.`);
    } else if (error.message?.includes('Authentication') || error.message?.includes('session')) {
      toast.error(error.message);
    } else {
      toast.error(`Failed to invite contractor: ${error.message || 'Unknown error'}`);
    }
    return false;
  }
};
