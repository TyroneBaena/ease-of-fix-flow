
import { User as SupabaseUser } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'manager' | 'contractor';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profilePicture?: string;
  assignedProperties?: string[]; // Array of property IDs for managers
  createdAt: string;
}

export interface UserWithSupabaseData extends User {
  supabaseUser?: SupabaseUser;
}
