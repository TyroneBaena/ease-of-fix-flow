
import { User, UserRole } from '@/types/user';
import { AddUserResult } from './useUserProvider';

export interface UserContextType {
  currentUser: User | null;
  users: User[];
  loading: boolean;
  loadingError: Error | null;
  fetchUsers: () => Promise<void>;
  addUser: (email: string, name: string, role: UserRole, assignedProperties?: string[]) => Promise<AddUserResult>;
  updateUser: (user: User) => Promise<void>;
  removeUser: (userId: string) => Promise<void>;
  resetPassword: (userId: string, email: string) => Promise<void>;
  isAdmin: boolean;  // Changed from function to boolean
  canAccessProperty: (propertyId: string) => boolean;
  signOut: () => Promise<void>;
}
