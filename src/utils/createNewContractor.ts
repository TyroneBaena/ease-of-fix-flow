import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Creates a single new contractor user account
 */
export const createNewContractor = async (): Promise<void> => {
  console.log('🚀 Creating new contractor user...');
  
  try {
    // Create the user account using admin auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'newcontractor@test.com',
      password: 'Test123!@#',
      email_confirm: true,
      user_metadata: {
        name: 'New Contractor',
        role: 'contractor'
      }
    });
    
    if (authError) {
      console.error('Error creating contractor auth user:', authError);
      toast.error('Failed to create contractor user', {
        description: authError.message
      });
      return;
    }
    
    console.log('✅ Contractor user created successfully');
    toast.success('New contractor account created!', {
      description: 'You can now login with newcontractor@test.com'
    });
    
  } catch (error: any) {
    console.error('Error creating new contractor:', error);
    toast.error('Failed to create contractor', {
      description: error.message
    });
  }
};