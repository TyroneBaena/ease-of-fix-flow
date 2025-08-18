import { userService } from '@/services/userService';
import { TEST_CREDENTIALS, displayTestCredentials } from './testCredentials';
import { toast } from 'sonner';

/**
 * Creates test users for development with different role types
 */
export const createTestUsers = async (): Promise<void> => {
  console.log('🚀 Creating test users...');
  
  const results: { role: string; success: boolean; message: string }[] = [];
  
  for (const credential of TEST_CREDENTIALS) {
    try {
      console.log(`Creating ${credential.role} user: ${credential.email}`);
      
      const result = await userService.inviteUser(
        credential.email,
        credential.name,
        credential.role,
        credential.role === 'manager' ? [] : undefined // Empty assigned properties for managers
      );
      
      if (result.success) {
        results.push({
          role: credential.role,
          success: true,
          message: `✅ ${credential.role} user created successfully`
        });
        console.log(`✅ ${credential.role} user created: ${credential.email}`);
      } else {
        results.push({
          role: credential.role,
          success: false,
          message: `❌ Failed to create ${credential.role} user: ${result.message}`
        });
        console.error(`❌ Failed to create ${credential.role} user:`, result.message);
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
      const exists = await userService.checkUserExists(credential.email);
      existingUsers[credential.role] = exists;
    } catch (error) {
      existingUsers[credential.role] = false;
    }
  }
  
  return existingUsers;
};