
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/types/user';

export async function fetchAllUsers(): Promise<User[]> {
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['admin', 'manager']);
    
  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    throw profilesError;
  }
  
  return (profiles || []).map(profile => ({
    id: profile.id,
    name: profile.name || '',
    email: profile.email || '',
    role: profile.role as UserRole || 'manager',
    assignedProperties: profile.assigned_properties || [],
    createdAt: profile.created_at || ''
  }));
}

export async function checkExistingUser(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  
  const { count, error: profilesError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .ilike('email', normalizedEmail);
  
  if (profilesError) {
    console.error("Error checking for existing user in profiles:", profilesError);
    return false;
  }
  
  return (count || 0) > 0;
}

export async function checkUserAdminStatus(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error("Error checking user admin status:", error);
    return false;
  }
  
  return data.role === 'admin';
}
