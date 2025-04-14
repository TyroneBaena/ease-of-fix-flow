
import React, { useState } from 'react';
import { usePropertyContext } from '@/contexts/PropertyContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogFooter } from "@/components/ui/dialog";
import { toast } from '@/lib/toast';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'rentAmount' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
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
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Property Name*</Label>
            <Input 
              id="name" 
              name="name"
              value={form.name} 
              onChange={handleChange} 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Address*</Label>
            <Input 
              id="address" 
              name="address"
              value={form.address} 
              onChange={handleChange} 
              required 
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contactNumber">Contact Number*</Label>
            <Input 
              id="contactNumber" 
              name="contactNumber"
              value={form.contactNumber} 
              onChange={handleChange} 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address*</Label>
            <Input 
              id="email" 
              name="email"
              type="email"
              value={form.email} 
              onChange={handleChange} 
              required 
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="practiceLeader">Practice Leader*</Label>
          <Input 
            id="practiceLeader" 
            name="practiceLeader"
            value={form.practiceLeader} 
            onChange={handleChange} 
            required 
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="practiceLeaderEmail">Leader Email</Label>
            <Input 
              id="practiceLeaderEmail" 
              name="practiceLeaderEmail"
              type="email"
              value={form.practiceLeaderEmail} 
              onChange={handleChange} 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="practiceLeaderPhone">Leader Phone</Label>
            <Input 
              id="practiceLeaderPhone" 
              name="practiceLeaderPhone"
              value={form.practiceLeaderPhone} 
              onChange={handleChange} 
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="renewalDate">Rental Agreement Renewal Date</Label>
            <Input 
              id="renewalDate" 
              name="renewalDate"
              type="date"
              value={form.renewalDate} 
              onChange={handleChange} 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="rentAmount">Rent Amount</Label>
            <Input 
              id="rentAmount" 
              name="rentAmount"
              type="number"
              min="0"
              step="0.01"
              value={form.rentAmount} 
              onChange={handleChange} 
            />
          </div>
        </div>
      </div>
      
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit">{isEditing ? 'Update' : 'Add'} Property</Button>
      </DialogFooter>
    </form>
  );
};
