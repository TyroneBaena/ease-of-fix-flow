
import { useState, useEffect } from 'react';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { toast } from '@/lib/toast';
import { PropertyFormData, UsePropertyFormProps } from '@/types/propertyForm';
import { User } from '@/types/user';
import { STRIPE_CONFIG } from '@/config/stripe';

export const usePropertyForm = ({ existingProperty, onClose }: UsePropertyFormProps) => {
  const { addProperty, updateProperty, properties } = usePropertyContext();
  const { users } = useUserContext();
  const { isTrialActive, propertyCount, hasPaymentMethod } = useSubscription();
  const [managers, setManagers] = useState<User[]>([]);
  
  const [form, setForm] = useState<PropertyFormData>({
    name: existingProperty?.name || '',
    address: existingProperty?.address || '',
    contactNumber: existingProperty?.contactNumber || '',
    email: existingProperty?.email || '',
    practiceLeader: existingProperty?.practiceLeader || '',
    practiceLeaderEmail: existingProperty?.practiceLeaderEmail || '',
    practiceLeaderPhone: existingProperty?.practiceLeaderPhone || '',
    renewalDate: existingProperty?.renewalDate ? new Date(existingProperty.renewalDate).toISOString().split('T')[0] : '',
    rentAmount: existingProperty?.rentAmount || 0,
    rentPeriod: existingProperty?.rentPeriod || 'month',
    landlordId: existingProperty?.landlordId,
  });

  useEffect(() => {
    console.log('PropertyForm: All users:', users);
    console.log('PropertyForm: Users with roles:', users.map(u => ({ name: u.name, role: u.role })));
    
    // Get all users who can be practice leaders (managers and admins)
    const managerUsers = users.filter(user => user.role === 'manager' || user.role === 'admin');
    console.log('PropertyForm: Practice leader candidates:', managerUsers.map(u => ({ name: u.name, role: u.role })));
    
    setManagers(managerUsers);
  }, [users]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'rentAmount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleRentPeriodChange = (value: 'week' | 'month') => {
    setForm(prev => ({
      ...prev,
      rentPeriod: value
    }));
  };

  const handlePracticeLeaderChange = (userId: string) => {
    const selectedManager = managers.find(manager => manager.id === userId);
    if (selectedManager) {
      setForm(prev => ({
        ...prev,
        practiceLeader: selectedManager.name,
        practiceLeaderEmail: selectedManager.email,
        practiceLeaderPhone: '',
      }));
    }
  };

  const handleLandlordChange = (landlordId: string | null) => {
    setForm(prev => ({ ...prev, landlordId: landlordId || undefined }));
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('PropertyForm: Form submit triggered');
    console.log('PropertyForm: Current form state:', form);
    
    // Enforce 1-property limit for trial users without payment method
    console.log('🟡 PropertyForm - Property Limit Check:', {
      existingProperty: !!existingProperty,
      isTrialActive,
      hasPaymentMethod,
      propertyCount,
      propertiesLength: properties?.length
    });
    
    if (!existingProperty && isTrialActive && !hasPaymentMethod) {
      const currentPropertyCount = propertyCount || properties?.length || 0;
      
      if (currentPropertyCount >= 1) {
        console.log('PropertyForm: Trial property limit reached', { 
          currentCount: currentPropertyCount, 
          limit: 1 
        });
        
        toast.error(
          'Trial accounts are limited to 1 property. Add a payment method to add unlimited properties.',
          {
            action: {
              label: 'Add Payment Method',
              onClick: () => window.location.href = '/billing-security'
            },
            duration: 10000,
          }
        );
        return;
      }
    }
    
    const requiredFields = ['name', 'address', 'contactNumber', 'email', 'practiceLeader'];
    const missingFields = requiredFields.filter(field => {
      const value = form[field as keyof typeof form];
      const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
      if (isEmpty) {
        console.log(`PropertyForm: Missing field '${field}':`, value);
      }
      return isEmpty;
    });
    
    if (missingFields.length > 0) {
      console.error('PropertyForm: Validation failed, missing fields:', missingFields);
      return;
    }
    
    console.log('PropertyForm: Validation passed, proceeding with submission');
    
    try {
      console.log('PropertyForm: Submitting form with data:', form);
      console.log('PropertyForm: Is editing?', !!existingProperty);
      
      if (existingProperty) {
        console.log('PropertyForm: Updating property ID:', existingProperty.id);
        console.log('PropertyForm: Update data being sent:', form);
        await updateProperty(existingProperty.id, form);
        toast.success('Property updated successfully');
      } else {
        console.log('PropertyForm: Adding new property');
        await addProperty(form);
        toast.success('Property added successfully');
      }
      onClose();
    } catch (error) {
      console.error('PropertyForm: Error saving property:', error);
      toast.error('Failed to save property');
      console.error(error);
    }
  };

  return {
    form,
    managers,
    handleChange,
    handleRentPeriodChange,
    handlePracticeLeaderChange,
    handleLandlordChange,
    handleSubmit,
  };
};
