
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
  phone?: string; // Added phone field
  profilePicture?: string;
  assignedProperties?: string[]; // Array of property IDs for managers
  organization_id?: string; // Organization ID for multi-tenancy
  createdAt: string;
  notificationSettings?: NotificationSettings;
  unreadNotifications?: number; // Count of unread notifications
}

export interface UserWithSupabaseData extends User {
  supabaseUser?: SupabaseUser;
}
