
import React, { ReactNode } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';

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
  const { canAccessProperty } = useUserContext();
  const navigate = useNavigate();
  
  const hasAccess = canAccessProperty(propertyId);
  
  if (!hasAccess) {
    return fallback || (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-gray-500 mb-4">You don't have permission to access this property.</p>
        <button 
          onClick={() => navigate('/properties')}
          className="text-blue-500 hover:underline"
        >
          Return to Properties
        </button>
      </div>
    );
  }
  
  return <>{children}</>;
};

export default PropertyAccessControl;
