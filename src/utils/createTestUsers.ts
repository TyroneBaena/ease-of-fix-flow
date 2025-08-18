import { supabase } from '@/integrations/supabase/client';
import { TEST_CREDENTIALS, displayTestCredentials } from './testCredentials';
import { toast } from 'sonner';

/**
 * Creates test users directly using Supabase admin API
 */
export const createTestUsers = async (): Promise<void> => {
  console.log('🚀 Creating test users...');
  
  const results: { role: string; success: boolean; message: string }[] = [];
  
  for (const credential of TEST_CREDENTIALS) {
    try {
      console.log(`Creating ${credential.role} user: ${credential.email}`);
      
      // Create user directly with Supabase admin API
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: credential.email,
        password: credential.password,
        email_confirm: true,
        user_metadata: {
          name: credential.name,
          role: credential.role
        }
      });
      
      if (authError) {
        console.error(`Auth error for ${credential.role}:`, authError);
        results.push({
          role: credential.role,
          success: false,
          message: `❌ Failed to create ${credential.role} user: ${authError.message}`
        });
        continue;
      }
      
      if (authData.user) {
        // Create profile entry
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            name: credential.name,
            email: credential.email,
            role: credential.role,
            assigned_properties: credential.role === 'manager' ? [] : null
          });
        
        if (profileError) {
          console.error(`Profile error for ${credential.role}:`, profileError);
          results.push({
            role: credential.role,
            success: false,
            message: `❌ Failed to create profile for ${credential.role}: ${profileError.message}`
          });
        } else {
          results.push({
            role: credential.role,
            success: true,
            message: `✅ ${credential.role} user created successfully`
          });
          console.log(`✅ ${credential.role} user created: ${credential.email}`);
        }
      }
    } catch (error: any) {
      results.push({
        role: credential.role,
        success: false,
        message: `❌ Error creating ${credential.role} user: ${error.message}`
      });
      console.error(`❌ Error creating ${credential.role} user:`, error);
    }
  }
  
  // Display results
  console.log('\n📊 Test User Creation Results:');
  console.log('===============================');
  results.forEach(result => {
    console.log(result.message);
  });
  
  // Show credentials for successful users
  const successfulUsers = results.filter(r => r.success);
  if (successfulUsers.length > 0) {
    console.log('\n🔐 Login Credentials:');
    displayTestCredentials();
    
    // Show toast notification
    toast.success(`Created ${successfulUsers.length} test users successfully!`, {
      description: 'Check console for login credentials'
    });
  }
  
  if (results.some(r => !r.success)) {
    toast.error('Some test users failed to create', {
      description: 'Check console for details'
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