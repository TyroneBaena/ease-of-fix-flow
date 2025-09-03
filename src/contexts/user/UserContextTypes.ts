
import { User, UserRole } from '@/types/user';
import { AddUserResult } from './useUserProvider'; // Updated AddUserResult interface
import { AdminPasswordResetResult } from '@/services/user/adminPasswordReset';

export interface UserContextType {
  currentUser: User | null;
  users: User[];
  loading: boolean;
  loadingError: Error | null;
  fetchUsers: () => Promise<void>;
  addUser: (email: string, name: string, role: UserRole, assignedProperties?: string[]) => Promise<AddUserResult>;
  updateUser: (user: User) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  resetPassword: (userId: string, email: string) => Promise<{success: boolean; message: string}>;
  adminResetPassword: (userId: string, email: string) => Promise<AdminPasswordResetResult>;
  isAdmin: boolean;  // Changed from function to boolean
  canAccessProperty: (propertyId: string) => boolean;
  signOut: () => Promise<void>;
}
