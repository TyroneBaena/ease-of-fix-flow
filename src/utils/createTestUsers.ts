import { supabase } from '@/integrations/supabase/client';
import { TEST_CREDENTIALS, displayTestCredentials } from './testCredentials';
import { toast } from 'sonner';

/**
 * Creates test users using the edge function
 */
export const createTestUsers = async (): Promise<void> => {
  console.log('🚀 Creating test users...');
  
  try {
    const { data, error } = await supabase.functions.invoke('create-test-users');
    
    if (error) {
      console.error('Error creating test users:', error);
      toast.error('Failed to create test users', {
        description: error.message
      });
      return;
    }
    
    if (data?.success) {
      const results = data.results || [];
      
      // Display results
      console.log('\n📊 Test User Creation Results:');
      console.log('===============================');
      results.forEach((result: any) => {
        console.log(`${result.success ? '✅' : '❌'} ${result.message}`);
      });
      
      // Show credentials for successful users
      const successfulUsers = results.filter((r: any) => r.success);
      if (successfulUsers.length > 0) {
        console.log('\n🔐 Login Credentials:');
        displayTestCredentials();
        
        // Show toast notification
        toast.success(`Created ${successfulUsers.length} test users successfully!`, {
          description: 'Check console for login credentials'
        });
      }
      
      if (results.some((r: any) => !r.success)) {
        toast.error('Some test users failed to create', {
          description: 'Check console for details'
        });
      }
    } else {
      toast.error('Failed to create test users', {
        description: data?.error || 'Unknown error occurred'
      });
    }
  } catch (error: any) {
    console.error('Error calling create-test-users function:', error);
    toast.error('Failed to create test users', {
      description: error.message
    });
  }
};

/**
 * Helper to check if test users already exist
 */
export const checkTestUsersExist = async (): Promise<{ [key: string]: boolean }> => {
  const existingUsers: { [key: string]: boolean } = {};
  
  for (const credential of TEST_CREDENTIALS) {
    try {
      const { data: user } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', credential.email)
        .single();
      
      existingUsers[credential.role] = !!user;
    } catch (error) {
      existingUsers[credential.role] = false;
    }
  }
  
  return existingUsers;
};