
import React, { useState, useEffect } from 'react';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { useUserContext } from '@/contexts/UserContext';
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { toast } from '@/lib/toast';
import { User } from '@/types/user';
import { BasicInfoFields } from './form/BasicInfoFields';
import { PracticeLeaderFields } from './form/PracticeLeaderFields';
import { RentalFields } from './form/RentalFields';

interface PropertyFormProps {
  onClose: () => void;
  existingProperty?: {
    id: string;
    name: string;
    address: string;
    contactNumber: string;
    email: string;
    practiceLeader: string;
    practiceLeaderEmail: string;
    practiceLeaderPhone: string;
    renewalDate: string;
    rentAmount: number;
  };
}

export const PropertyForm: React.FC<PropertyFormProps> = ({ onClose, existingProperty }) => {
  const isEditing = !!existingProperty;
  const { addProperty, updateProperty } = usePropertyContext();
  const { users } = useUserContext();
  const [managers, setManagers] = useState<User[]>([]);
  
  const [form, setForm] = useState({
    name: existingProperty?.name || '',
    address: existingProperty?.address || '',
    contactNumber: existingProperty?.contactNumber || '',
    email: existingProperty?.email || '',
    practiceLeader: existingProperty?.practiceLeader || '',
    practiceLeaderEmail: existingProperty?.practiceLeaderEmail || '',
    practiceLeaderPhone: existingProperty?.practiceLeaderPhone || '',
    renewalDate: existingProperty?.renewalDate ? new Date(existingProperty.renewalDate).toISOString().split('T')[0] : '',
    rentAmount: existingProperty?.rentAmount || 0,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const requiredFields = ['name', 'address', 'contactNumber', 'email', 'practiceLeader'];
    const missingFields = requiredFields.filter(field => !form[field as keyof typeof form]);
    
    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    try {
      if (isEditing && existingProperty) {
        updateProperty(existingProperty.id, form);
        toast.success('Property updated successfully');
      } else {
        addProperty(form);
        toast.success('Property added successfully');
      }
      onClose();
    } catch (error) {
      toast.error('Failed to save property');
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 py-4">
        <BasicInfoFields
          name={form.name}
          address={form.address}
          contactNumber={form.contactNumber}
          email={form.email}
          onChange={handleChange}
        />
        
        <PracticeLeaderFields
          managers={managers}
          practiceLeader={form.practiceLeader}
          practiceLeaderEmail={form.practiceLeaderEmail}
          practiceLeaderPhone={form.practiceLeaderPhone}
          onPracticeLeaderChange={handlePracticeLeaderChange}
          onChange={handleChange}
        />
        
        <RentalFields
          renewalDate={form.renewalDate}
          rentAmount={form.rentAmount}
          onChange={handleChange}
        />
      </div>
      
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit">{isEditing ? 'Update' : 'Add'} Property</Button>
      </DialogFooter>
    </form>
  );
};
