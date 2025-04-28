
import { User, UserRole } from '@/types/user';

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

export interface UserCheckResult {
  exists: boolean;
  email?: string;
  profile?: any;
}

export interface UserService {
  getAllUsers: () => Promise<User[]>;
  checkUserExists: (email: string) => Promise<boolean>;
  inviteUser: (email: string, name: string, role: UserRole, assignedProperties?: string[]) => Promise<InviteUserResult>;
  updateUser: (user: User) => Promise<void>;
  resetPassword: (userId: string, email: string) => Promise<{success: boolean; message: string}>;
  deleteUser: (userId: string) => Promise<void>;
  isUserAdmin: (userId: string) => Promise<boolean>;
}
