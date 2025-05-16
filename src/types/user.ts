
import { User as SupabaseUser } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'manager' | 'contractor';

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  appNotifications: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profilePicture?: string;
  assignedProperties?: string[]; // Array of property IDs for managers
  createdAt: string;
  notificationSettings?: NotificationSettings;
}

export interface UserWithSupabaseData extends User {
  supabaseUser?: SupabaseUser;
}
