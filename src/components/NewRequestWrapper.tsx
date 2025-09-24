import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import OrganizationGuard from '@/components/OrganizationGuard';
import { MaintenanceRequestProvider } from '@/contexts/maintenance';
import { PropertyProvider } from '@/contexts/property/PropertyContext';
import { PublicPropertyProvider } from '@/contexts/property/PublicPropertyProvider';
import NewRequest from '@/pages/NewRequest';

/**
 * Wrapper component that handles both authenticated and public access
 * to the new request form. When accessed with public=true, it bypasses authentication.
 */
const NewRequestWrapper = () => {
  const [searchParams] = useSearchParams();
  const isPublic = searchParams.get('public') === 'true';

  // For public access (QR code users), render without protection
  if (isPublic) {
    return (
      <PublicPropertyProvider>
        <MaintenanceRequestProvider>
          <NewRequest />
        </MaintenanceRequestProvider>
      </PublicPropertyProvider>
    );
  }

  // Otherwise, require authentication
  return (
    <ProtectedRoute>
      <OrganizationGuard>
        <MaintenanceRequestProvider>
          <PropertyProvider>
            <NewRequest />
          </PropertyProvider>
        </MaintenanceRequestProvider>
      </OrganizationGuard>
    </ProtectedRoute>
  );
};

export default NewRequestWrapper;
