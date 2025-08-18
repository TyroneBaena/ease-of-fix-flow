# Test Credentials for Development

This document contains the default test credentials for different user roles in the maintenance management system.

## 🔐 Default Test Accounts

### Admin User
- **Email:** `admin@test.com`
- **Password:** `Test123!@#`
- **Role:** Admin
- **Access:** Full system access - can manage all users, properties, and requests

### Manager User
- **Email:** `manager@test.com`
- **Password:** `Test123!@#`
- **Role:** Manager
- **Access:** Property management access - can manage assigned properties and requests

### Contractor User
- **Email:** `contractor@test.com`
- **Password:** `Test123!@#`
- **Role:** Contractor
- **Access:** Contractor access - can view assigned jobs, submit quotes, and update progress

## 🚀 How to Create Test Users

### Method 1: Using the Development Panel
1. Login as an admin user
2. Go to Settings page
3. Use the "Development Tools" panel (only visible to admins)
4. Click "Create Test Users" button
5. The system will automatically create all three test users

### Method 2: Using the Console
```typescript
import { createTestUsers } from '@/utils/createTestUsers';

// Create all test users
await createTestUsers();
```

### Method 3: Manual Creation
1. Go to Settings → User Management (as admin)
2. Click "Add User"
3. Enter the credentials from above for each role type

## 🔍 Checking Test User Status

You can check if test users exist using:

```typescript
import { checkTestUsersExist } from '@/utils/createTestUsers';

const status = await checkTestUsersExist();
console.log(status); // { admin: true, manager: false, contractor: true }
```

## 📋 Available Utilities

### Display Credentials in Console
```typescript
import { displayTestCredentials } from '@/utils/testCredentials';

displayTestCredentials(); // Prints formatted credentials to console
```

### Get Credentials by Role
```typescript
import { getCredentialsByRole } from '@/utils/testCredentials';

const adminCreds = getCredentialsByRole('admin');
console.log(adminCreds?.email); // admin@test.com
```

## ⚠️ Important Notes

- **Security:** These are development credentials only - never use in production
- **Password Policy:** All test passwords follow the format `Test123!@#`
- **Email Verification:** You may need to disable email confirmation in Supabase settings for faster testing
- **Admin Access:** The Development Tools panel is only visible to admin users
- **Automatic Creation:** Test users are created using the same invite system as regular users

## 🔧 Development Workflow

1. **First Time Setup:**
   - Create admin user manually or use existing admin
   - Use Development Tools to create test users
   - Verify all roles work correctly

2. **Testing Different Roles:**
   - Login with different test credentials
   - Verify role-based access controls
   - Test role-specific features

3. **Clean Development:**
   - Use consistent test data
   - Reset test users when needed
   - Document any role changes

## 🎯 Testing Scenarios

### Admin Testing
- User management (create, edit, delete users)
- Property management across all properties
- Contractor management
- System-wide reports and analytics

### Manager Testing
- Property management for assigned properties
- Maintenance request handling
- Contractor coordination
- Property-specific reports

### Contractor Testing
- View assigned maintenance requests
- Submit quotes for jobs
- Update job progress
- Upload invoices and completion photos

---

**Last Updated:** $(date)  
**Version:** 1.0.0