import React from 'react';
import { PropertyForm } from './PropertyForm';
import { PropertyAccessGuard } from './PropertyAccessGuard';
import { usePropertyAccessControl } from '@/hooks/usePropertyAccessControl';

interface EnhancedPropertyFormProps {
  existingProperty?: any;
  onClose: () => void;
}

export const EnhancedPropertyForm: React.FC<EnhancedPropertyFormProps> = ({
  existingProperty,
  onClose
}) => {
  const { handleRestrictedAction } = usePropertyAccessControl();
  const action = existingProperty ? 'update' : 'create';

  const handleFormSubmit = async () => {
    try {
      // The actual form submission is handled by PropertyForm
    } catch (error) {
      handleRestrictedAction(`${action} property`);
    }
  };

  return (
    <PropertyAccessGuard action={action}>
      <PropertyForm 
        existingProperty={existingProperty}
        onClose={onClose}
      />
    </PropertyAccessGuard>
  );
};