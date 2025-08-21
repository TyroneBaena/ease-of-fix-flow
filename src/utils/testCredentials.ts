/**
 * Test Credentials for Development
 * 
 * These are the default test accounts for each user role type.
 * Use these credentials to test different user functionalities.
 */

export interface TestCredentials {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'manager' | 'contractor';
  description: string;
}

export const TEST_CREDENTIALS: TestCredentials[] = [
  {
    email: 'admin@test.com',
    password: 'Test123!@#',
    name: 'Admin User',
    role: 'admin',
    description: 'Full system access - can manage all users, properties, and requests'
  },
  {
    email: 'manager@test.com', 
    password: 'Test123!@#',
    name: 'Manager User',
    role: 'manager',
    description: 'Property management access - can manage assigned properties and requests'
  },
  {
    email: 'plumber@test.com',
    password: 'Test123!@#', 
    name: 'Mike Johnson',
    role: 'contractor',
    description: 'Plumbing Contractor - specializes in plumbing and water damage repairs'
  },
  {
    email: 'electrician@test.com',
    password: 'Test123!@#', 
    name: 'Sarah Wilson',
    role: 'contractor',
    description: 'Electrical Contractor - specializes in electrical and HVAC systems'
  },
  {
    email: 'handyman@test.com',
    password: 'Test123!@#', 
    name: 'David Brown',
    role: 'contractor',
    description: 'General Contractor - handles carpentry, painting, and general maintenance'
  }
];

/**
 * Helper function to get credentials by role
 */
export const getCredentialsByRole = (role: 'admin' | 'manager' | 'contractor'): TestCredentials | undefined => {
  return TEST_CREDENTIALS.find(cred => cred.role === role);
};

/**
 * Helper function to display all test credentials
 */
export const displayTestCredentials = (): void => {
  console.log('🔐 Test Credentials for Development:');
  console.log('=====================================');
  
  TEST_CREDENTIALS.forEach((cred, index) => {
    console.log(`\n${index + 1}. ${cred.role.toUpperCase()} USER:`);
    console.log(`   Email: ${cred.email}`);
    console.log(`   Password: ${cred.password}`);
    console.log(`   Name: ${cred.name}`);
    console.log(`   Access: ${cred.description}`);
  });
  
  console.log('\n⚠️  Note: These are test accounts for development only!');
};