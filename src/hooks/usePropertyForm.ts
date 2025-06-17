
import { useState, useEffect } from 'react';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from '@/lib/toast';
import { PropertyFormData, UsePropertyFormProps } from '@/types/propertyForm';
import { User } from '@/types/user';

export const usePropertyForm = ({ existingProperty, onClose }: UsePropertyFormProps) => {
  const { addProperty, updateProperty } = usePropertyContext();
  const { users } = useUserContext();
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
  });

  useEffect(() => {
    const managerUsers = users.filter(user => user.role === 'manager');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const requiredFields = ['name', 'address', 'contactNumber', 'email', 'practiceLeader'];
    const missingFields = requiredFields.filter(field => !form[field as keyof typeof form]);
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    try {
      if (existingProperty) {
        await updateProperty(existingProperty.id, form);
        toast.success('Property updated successfully');
      } else {
        await addProperty(form);
        toast.success('Property added successfully');
      }
      onClose();
    } catch (error) {
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
    handleSubmit,
  };
};
