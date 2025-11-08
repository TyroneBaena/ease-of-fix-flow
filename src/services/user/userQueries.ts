
import { supabase } from '@/integrations/supabase/client';
import { User, UserRole } from '@/types/user';

export async function fetchAllUsers(): Promise<User[]> {
  console.log("📋 v79.2 - fetchAllUsers: Getting current user's organization");
  
  // First, get the current user's organization ID
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error("❌ Error getting current user:", authError);
    throw new Error("Authentication required to fetch users");
  }

  console.log("📋 Current authenticated user:", { id: user.id, email: user.email });

  // Get the current user's profile to find their organization
  const { data: initialProfile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id, role, session_organization_id')
    .eq('id', user.id)
    .maybeSingle();

  console.log("📋 Profile query result:", { profile: initialProfile, error: profileError });

  if (profileError) {
    console.error("❌ Error fetching current user profile:", profileError);
    throw new Error(`Database error while fetching user profile: ${profileError.message}`);
  }

  let currentUserProfile = initialProfile;

  if (!currentUserProfile) {
    console.error("❌ No profile found for current user");
    
    // Try to get user's organization from user_organizations table
    const { data: userOrg, error: userOrgError } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('is_default', true)
      .maybeSingle();
    
    if (userOrgError || !userOrg) {
      console.error("❌ No organization found in user_organizations either");
      throw new Error("User profile not found. Please complete your account setup or contact support.");
    }
    
    // Initialize the missing profile using the organization from user_organizations
    console.log("🔧 Initializing missing profile for user");
    const { error: initError } = await supabase.rpc('initialize_user_profile', {
      user_id_param: user.id,
      email_param: user.email,
      name_param: user.user_metadata?.name || null,
      organization_id_param: userOrg.organization_id
    });
    
    if (initError) {
      console.error("❌ Error initializing user profile:", initError);
      throw new Error("Failed to initialize user profile. Please contact support.");
    }
    
    // Re-fetch the profile after initialization
    const { data: refreshedProfile, error: refreshError } = await supabase
      .from('profiles')
      .select('organization_id, role, session_organization_id')
      .eq('id', user.id)
      .single();
    
    if (refreshError || !refreshedProfile) {
      console.error("❌ Failed to fetch profile after initialization");
      throw new Error("Profile initialization failed. Please contact support.");
    }
    
    console.log("✅ Profile initialized successfully:", refreshedProfile);
    // Use the refreshed profile
    currentUserProfile = refreshedProfile;
  }

  // Use session organization if available, otherwise use default organization
  const userOrgId = currentUserProfile.session_organization_id || currentUserProfile.organization_id;

  if (!userOrgId) {
    console.error("❌ User has no organization assigned");
    throw new Error("You must be assigned to an organization to view users. Please complete organization onboarding.");
  }

  console.log("📋 Current user organization:", userOrgId);
  console.log("📋 Current user role:", currentUserProfile.role);
  
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
