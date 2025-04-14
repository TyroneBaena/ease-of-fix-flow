
import { User } from '@/types/user';

/**
 * Check if a user is an admin
 */
export const isUserAdmin = (user: User | null): boolean => {
  return user?.role === 'admin';
};

/**
 * Check if a user can access a specific property
 */
export const canUserAccessProperty = (user: User | null, propertyId: string): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.assignedProperties?.includes(propertyId) || false;
};
