import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext, useMultiOrganizationContext } from './UnifiedAuthContext';

interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  settings: any;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  loading: boolean;
  error: string | null;
  refreshOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganizationContext = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganizationContext must be used within an OrganizationProvider');
  }
  return context;
};

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // This provider now acts as a bridge to the MultiOrganizationContext
  // for backward compatibility with existing code
  try {
    const multiOrgContext = useMultiOrganizationContext();
    
    const value: OrganizationContextType = {
      currentOrganization: multiOrgContext.currentOrganization,
      loading: multiOrgContext.loading,
      error: multiOrgContext.error,
      refreshOrganization: multiOrgContext.refreshOrganizations
    };

    return (
      <OrganizationContext.Provider value={value}>
        {children}
      </OrganizationContext.Provider>
    );
  } catch (error) {
    // Fallback to original implementation if MultiOrganizationContext is not available
    console.warn('MultiOrganizationContext not available, using fallback OrganizationProvider');
    return <FallbackOrganizationProvider>{children}</FallbackOrganizationProvider>;
  }
};

const FallbackOrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useUserContext();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrganization = async () => {
    if (!currentUser?.organization_id) {
      setCurrentOrganization(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', currentUser.organization_id)
          .single();

        clearTimeout(timeoutId);

        if (error) throw error;
        setCurrentOrganization(data);
        setError(null);
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        throw fetchErr;
      }
    } catch (err) {
      console.error('Error fetching organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch organization');
      setCurrentOrganization(null);
    } finally {
      // CRITICAL: Always reset loading state
      setLoading(false);
    }
  };

  const refreshOrganization = async () => {
    await fetchOrganization();
  };

  // Track previous org ID to prevent unnecessary refreshes
  const prevOrgIdRef = React.useRef<string | undefined>();
  
  useEffect(() => {
    // Only fetch if organization ID actually changed
    const orgIdChanged = prevOrgIdRef.current !== currentUser?.organization_id;
    
    if (currentUser?.organization_id && orgIdChanged) {
      console.log('OrganizationContext - Organization ID changed, fetching');
      prevOrgIdRef.current = currentUser.organization_id;
      fetchOrganization();
    } else if (!currentUser?.organization_id) {
      prevOrgIdRef.current = undefined;
      setCurrentOrganization(null);
      setLoading(false);
    } else {
      console.log('OrganizationContext - Organization ID unchanged, skipping fetch');
    }
  }, [currentUser?.organization_id]);

  // Tab visibility handler removed - UnifiedAuthContext handles session validation
  // Organization data will be refetched naturally when needed

  const value: OrganizationContextType = {
    currentOrganization,
    loading,
    error,
    refreshOrganization
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};