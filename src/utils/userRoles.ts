import { User, UserRole } from '@/types/user';

/**
 * User role utility functions that avoid RLS recursion issues
 * by not making database calls during role checks
 */

/**
 * Check if a user is an admin based on local user object
 */
export const isUserAdmin = (user: User | null): boolean => {
  return user?.role === 'admin';
};

/**
 * Check if a user is a manager based on local user object
 */
export const isUserManager = (user: User | null): boolean => {
  return user?.role === 'manager';
};

/**
 * Check if a user is a contractor based on local user object
 */
export const isUserContractor = (user: User | null): boolean => {
  return user?.role === 'contractor';
};

/**
 * Check if a user can access a property based on local user object
 */
export const canUserAccessProperty = (user: User | null, propertyId: string): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.assignedProperties?.includes(propertyId) || false;
};

/**
 * Check if a user can manage users (admin or manager)
 */
export const canUserManageUsers = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'manager';
};

/**
 * Check if a user can manage contractors (admin only)
 */
export const canUserManageContractors = (user: User | null): boolean => {
  return isUserAdmin(user);
};

/**
 * Get user role display name
 */
export const getUserRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'manager':
      return 'Manager';
    case 'contractor':
      return 'Contractor';
    default:
      return role;
  }
};

/**
 * Check if a user has higher or equal permissions than another role
 */
export const hasRolePermission = (userRole: UserRole, requiredRole: UserRole): boolean => {
  const roleHierarchy = {
    'admin': 3,
    'manager': 2,
    'contractor': 1
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};