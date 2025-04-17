
import React from 'react';
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { BasicInfoFields } from './form/BasicInfoFields';
import { PracticeLeaderFields } from './form/PracticeLeaderFields';
import { RentalFields } from './form/RentalFields';
import { usePropertyForm } from '@/hooks/usePropertyForm';
import { Property } from '@/types/property';

interface PropertyFormProps {
  onClose: () => void;
  existingProperty?: Omit<Property, 'createdAt'> & {
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
  const { 
    form, 
    managers, 
    handleChange, 
    handlePracticeLeaderChange, 
    handleSubmit 
  } = usePropertyForm({ existingProperty, onClose });

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
