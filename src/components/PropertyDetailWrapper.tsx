import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import OrganizationGuard from '@/components/OrganizationGuard';
import { PropertyProvider } from '@/contexts/property/PropertyContext';
import { MaintenanceRequestProvider } from '@/contexts/maintenance';
import PropertyDetail from '@/pages/PropertyDetail';

interface TemporarySession {
  sessionToken: string;
  propertyId: string;
  propertyName: string;
  organizationId: string;
  expiresAt: string;
}

/**
 * Wrapper component that handles both authenticated and temporary session access
 * to property detail pages. When accessed via QR code, it bypasses authentication.
 */
const PropertyDetailWrapper = () => {
  const { id } = useParams<{ id: string }>();
  const [hasTemporarySession, setHasTemporarySession] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTemporarySession = () => {
      const storedSession = localStorage.getItem('temporarySession');
      
      if (storedSession) {
        try {
          const sessionData: TemporarySession = JSON.parse(storedSession);
          
          // Check if session matches property ID and is not expired
          if (sessionData.propertyId === id && new Date(sessionData.expiresAt) > new Date()) {
            setHasTemporarySession(true);
          }
        } catch (error) {
          console.error('Invalid temporary session data:', error);
          localStorage.removeItem('temporarySession');
        }
      }
      
      setLoading(false);
    };

    checkTemporarySession();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user has a valid temporary session, render without protection
  if (hasTemporarySession) {
    return (
      <PropertyProvider>
        <MaintenanceRequestProvider>
          <PropertyDetail />
        </MaintenanceRequestProvider>
      </PropertyProvider>
    );
  }

  // Otherwise, require authentication
  return (
    <ProtectedRoute>
      <OrganizationGuard>
        <PropertyProvider>
          <MaintenanceRequestProvider>
            <PropertyDetail />
          </MaintenanceRequestProvider>
        </PropertyProvider>
      </OrganizationGuard>
    </ProtectedRoute>
  );
};

export default PropertyDetailWrapper;
