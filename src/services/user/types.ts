
import { User, UserRole } from '@/types/user';
import { AdminPasswordResetResult } from './adminPasswordReset';

export interface InviteUserResult {
  success: boolean;
  message: string;
  userId?: string;
  emailSent?: boolean;
  emailError?: string;
  testMode?: boolean;
  testModeInfo?: string;
  isNewUser?: boolean;
  email?: string;
}

export interface UserService {
  getAllUsers: () => Promise<User[]>;
  checkUserExists: (email: string) => Promise<boolean>;
  inviteUser: (email: string, name: string, role: UserRole, assignedProperties?: string[]) => Promise<InviteUserResult>;
  updateUser: (user: User) => Promise<void>;
  resetPassword: (userId: string, email: string) => Promise<{success: boolean; message: string}>;
  adminResetPassword: (userId: string, email: string) => Promise<AdminPasswordResetResult>;
  deleteUser: (userId: string) => Promise<void>;
  isUserAdmin: (userId: string) => Promise<boolean>;
}
