
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/types/user';

export async function fetchAllUsers(): Promise<User[]> {
  console.log("📋 fetchAllUsers: Getting current user's organization");
  
  // First, get the current user's organization ID
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error("❌ Error getting current user for organization filtering:", authError);
    throw new Error("Authentication required to fetch users");
  }

  // Get the current user's profile to find their organization
  const { data: currentUserProfile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id, role, session_organization_id')
    .eq('id', user.id)
    .single();

  if (profileError || !currentUserProfile) {
    console.error("❌ Error fetching current user profile:", profileError);
    throw new Error("Unable to determine user organization");
  }

  // Use session organization if available, otherwise use default organization
  const userOrgId = currentUserProfile.session_organization_id || currentUserProfile.organization_id;

  if (!userOrgId) {
    console.error("❌ User has no organization assigned");
    throw new Error("User must be assigned to an organization to view users");
  }

  console.log("📋 Current user organization:", userOrgId);
  console.log("📋 Current user role:", currentUserProfile.role);

  // Fetch users from the same organization
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['admin', 'manager'])
    .eq('organization_id', userOrgId);
    
  if (profilesError) {
    console.error("❌ Error fetching profiles:", profilesError);
    throw profilesError;
  }

  console.log("📋 Found users in organization:", profiles?.length || 0);
  
  return (profiles || []).map(profile => ({
    id: profile.id,
    name: profile.name || '',
    email: profile.email || '',
    role: profile.role as UserRole || 'manager',
    assignedProperties: profile.assigned_properties || [],
    organization_id: profile.organization_id || undefined,
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
