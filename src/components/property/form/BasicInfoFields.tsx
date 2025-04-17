
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BasicInfoFieldsProps {
  name: string;
  address: string;
  contactNumber: string;
  email: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const BasicInfoFields: React.FC<BasicInfoFieldsProps> = ({
  name,
  address,
  contactNumber,
  email,
  onChange
}) => {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Property Name*</Label>
          <Input 
            id="name" 
            name="name"
            value={name} 
            onChange={onChange} 
            required 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="address">Address*</Label>
          <Input 
            id="address" 
            name="address"
            value={address} 
            onChange={onChange} 
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
            value={contactNumber} 
            onChange={onChange} 
            required 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email Address*</Label>
          <Input 
            id="email" 
            name="email"
            type="email"
            value={email} 
            onChange={onChange} 
            required 
          />
        </div>
      </div>
    </>
  );
};
