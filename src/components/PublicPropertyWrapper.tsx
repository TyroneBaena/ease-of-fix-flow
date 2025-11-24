import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { PublicPropertyProvider } from '@/contexts/property/PublicPropertyProvider';

interface PublicPropertyWrapperProps {
  children: React.ReactNode;
}

/**
 * Conditionally wraps children with PublicPropertyProvider when accessing via QR code
 */
export const PublicPropertyWrapper: React.FC<PublicPropertyWrapperProps> = ({ children }) => {
  const [searchParams] = useSearchParams();
  const isPublic = searchParams.get('public') === 'true';
  const hasPropertyId = searchParams.get('propertyId') !== null;

  // Only wrap with PublicPropertyProvider if this is a public access (QR code)
  if (isPublic && hasPropertyId) {
    return (
      <PublicPropertyProvider>
        {children}
      </PublicPropertyProvider>
    );
  }

  // Otherwise, return children as-is (will use regular PropertyProvider from App.tsx)
  return <>{children}</>;
};
