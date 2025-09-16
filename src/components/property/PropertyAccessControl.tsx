
import React, { ReactNode, useState, useEffect } from 'react';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { useMultiOrganizationContext } from '@/contexts/MultiOrganizationContext';
import { OrganizationAccessError } from '@/components/errors/OrganizationAccessError';
import { supabase } from '@/integrations/supabase/client';

interface PropertyAccessControlProps {
  propertyId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

const PropertyAccessControl: React.FC<PropertyAccessControlProps> = ({
  propertyId,
  children,
  fallback
}) => {
  const { currentUser, canAccessProperty } = useUserContext();
  const { currentOrganization } = useMultiOrganizationContext();
  const [propertyOrgId, setPropertyOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchPropertyOrganization = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('properties')
          .select('organization_id')
          .eq('id', propertyId)
          .single();

        if (error) throw error;
        setPropertyOrgId(data.organization_id);
      } catch (error) {
        console.error('Error fetching property organization:', error);
        setPropertyOrgId(null);
      } finally {
        setLoading(false);
      }
    };

    if (propertyId) {
      fetchPropertyOrganization();
    }
  }, [propertyId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  // Check if user can access this property via the traditional method
  const hasDirectAccess = canAccessProperty(propertyId);
  
  // Check if property belongs to current organization
  const hasOrganizationAccess = propertyOrgId === currentOrganization?.id;
  
  // Check if user is admin
  const isAdmin = currentUser?.role === 'admin';
  
  const hasAccess = hasDirectAccess || hasOrganizationAccess || isAdmin;
  
  if (!hasAccess) {
    return fallback || (
      <OrganizationAccessError 
        message="You don't have permission to access this property. It may belong to a different organization."
        showSwitcher={true}
      />
    );
  }
  
  return <>{children}</>;
};

export default PropertyAccessControl;
