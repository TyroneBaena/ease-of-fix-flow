import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { convertToAppUser } from '@/hooks/auth/userConverter';
import { toast } from '@/lib/toast';

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  settings: any;
}

interface UserOrganization {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  organization: Organization;
}

interface MultiOrganizationContextType {
  currentOrganization: Organization | null;
  userOrganizations: UserOrganization[];
  loading: boolean;
  error: string | null;
  switchOrganization: (organizationId: string) => Promise<void>;
  refreshOrganizations: () => Promise<void>;
  getCurrentUserRole: () => string;
  currentUser: any;
}

const MultiOrganizationContext = createContext<MultiOrganizationContextType | undefined>(undefined);

export const useMultiOrganizationContext = () => {
  const context = useContext(MultiOrganizationContext);
  if (context === undefined) {
    throw new Error('useMultiOrganizationContext must be used within a MultiOrganizationProvider');
  }
  return context;
};

export const MultiOrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<UserOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserOrganizations = async () => {
    if (!currentUser?.id) {
      setUserOrganizations([]);
      setCurrentOrganization(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Fetching organizations for user:', currentUser.id);

      // Fetch all organizations the user belongs to
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select(`
          id,
          user_id,
          organization_id,
          role,
          is_active,
          is_default,
          created_at,
          updated_at
        `)
        .eq('user_id', currentUser.id)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (userOrgsError) throw userOrgsError;

      // Handle case where user has no organizations yet
      if (!userOrgs || userOrgs.length === 0) {
        console.log('User has no organizations, checking if they have an organization_id in profile');
        
        // If user has an organization_id but no user_organizations record, create one
        if (currentUser.organization_id) {
          console.log('Creating user organization membership for existing organization');
          
          // Fetch the organization details
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', currentUser.organization_id)
            .single();
          
          if (!orgError && org) {
            // Create the user organization relationship
            const { data: newUserOrg, error: createError } = await supabase
              .from('user_organizations')
              .insert({
                user_id: currentUser.id,
                organization_id: currentUser.organization_id,
                role: currentUser.role || 'manager',
                is_active: true,
                is_default: true
              })
              .select(`
                id,
                user_id,
                organization_id,
                role,
                is_active,
                is_default,
                created_at,
                updated_at
              `)
              .single();
            
            if (!createError && newUserOrg) {
              const mappedUserOrg = {
                ...newUserOrg,
                organization: org as Organization
              };
              
              setUserOrganizations([mappedUserOrg]);
              setCurrentOrganization(org as Organization);
              setLoading(false);
              return;
            }
          }
        }
        
        // No organizations found and couldn't create one
        setUserOrganizations([]);
        setCurrentOrganization(null);
        setLoading(false);
        return;
      }

      // Fetch organization details separately
      const orgIds = (userOrgs || []).map(uo => uo.organization_id);
      const { data: organizations, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds);

      if (orgsError) throw orgsError;

      const mappedUserOrganizations = (userOrgs || []).map(uo => {
        const organization = organizations?.find(org => org.id === uo.organization_id);
        return {
          ...uo,
          organization: organization as Organization
        };
      }).filter(uo => uo.organization);

      setUserOrganizations(mappedUserOrganizations);

      // Set current organization
      if (mappedUserOrganizations.length > 0) {
        // Get current session organization from profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('session_organization_id')
          .eq('id', currentUser.id)
          .single();

        if (profileError) {
          console.warn('Error fetching profile:', profileError);
        }

        let targetOrg: Organization | null = null;

        // Try to find the session organization
        if (profile?.session_organization_id) {
          const sessionOrg = mappedUserOrganizations.find(
            uo => uo.organization_id === profile.session_organization_id
          );
          if (sessionOrg) {
            targetOrg = sessionOrg.organization;
          }
        }

        // Fallback to default organization
        if (!targetOrg) {
          const defaultOrg = mappedUserOrganizations.find(uo => uo.is_default);
          if (defaultOrg) {
            targetOrg = defaultOrg.organization;
          }
        }

        // Final fallback to first organization
        if (!targetOrg && mappedUserOrganizations.length > 0) {
          targetOrg = mappedUserOrganizations[0].organization;
        }

        setCurrentOrganization(targetOrg);
      } else {
        setCurrentOrganization(null);
      }
    } catch (err) {
      console.error('Error fetching user organizations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch organizations');
      setUserOrganizations([]);
      setCurrentOrganization(null);
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = async (organizationId: string) => {
    // Prevent concurrent organization switches
    if (loading) {
      console.log('Organization switch already in progress, skipping');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Validate organization exists in user's organizations first
      const targetOrgData = userOrganizations.find(
        uo => uo.organization_id === organizationId
      );

      if (!targetOrgData) {
        throw new Error('Organization not found in user organizations');
      }

      // Call the database function to switch organization
      const { data, error } = await supabase.rpc('switch_user_organization', {
        new_org_id: organizationId
      });

      if (error) {
        console.error('Database error switching organization:', error);
        throw new Error(`Failed to switch organization: ${error.message}`);
      }

      // Only update state after successful database operation
      setCurrentOrganization(targetOrgData.organization);
      toast.success(`Switched to ${targetOrgData.organization.name}`);
      
      console.log(`Successfully switched to organization: ${targetOrgData.organization.name}`);
    } catch (err) {
      console.error('Error switching organization:', err);
      const message = err instanceof Error ? err.message : 'Failed to switch organization';
      setError(message);
      toast.error(message);
      
      // Don't change current organization on error
    } finally {
      setLoading(false);
    }
  };

  const refreshOrganizations = async () => {
    await fetchUserOrganizations();
  };

  const getCurrentUserRole = (): string => {
    if (!currentOrganization || !currentUser?.id) {
      return 'manager';
    }

    const userOrg = userOrganizations.find(
      uo => uo.organization_id === currentOrganization.id
    );

    return userOrg?.role || 'manager';
  };

  useEffect(() => {
    console.log('Setting up auth listener in MultiOrganizationProvider');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const appUser = await convertToAppUser(session.user);
          console.log('User converted:', appUser.email);
          setCurrentUser(appUser);
          // Delay organization fetch to prevent race conditions
          setTimeout(() => fetchUserOrganizations(), 100);
        } catch (error) {
          console.error('Error converting user:', error);
          setCurrentUser(null);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out, clearing organization context');
        setCurrentUser(null);
        setUserOrganizations([]);
        setCurrentOrganization(null);
        setLoading(false);
      } else if (event === 'USER_UPDATED' && session?.user) {
        try {
          const appUser = await convertToAppUser(session.user);
          setCurrentUser(appUser);
          // Refresh organizations on user update
          setTimeout(() => fetchUserOrganizations(), 100);
        } catch (error) {
          console.error('Error converting updated user:', error);
        }
      }
    });

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        try {
          const appUser = await convertToAppUser(session.user);
          console.log('Initial session user:', appUser.email);
          setCurrentUser(appUser);
          fetchUserOrganizations();
        } catch (error) {
          console.error('Error converting initial session user:', error);
          setCurrentUser(null);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value: MultiOrganizationContextType = {
    currentOrganization,
    userOrganizations,
    loading,
    error,
    switchOrganization,
    refreshOrganizations,
    getCurrentUserRole,
    currentUser
  };

  return (
    <MultiOrganizationContext.Provider value={value}>
      {children}
    </MultiOrganizationContext.Provider>
  );
};