
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BasicInfoFieldProps } from '@/types/propertyForm';
import { GoogleMapsAddressInput } from '@/components/maps/GoogleMapsAddressInput';
import { useAppSettings } from '@/hooks/useAppSettings';

export const BasicInfoFields: React.FC<BasicInfoFieldProps> = ({
  name,
  address,
  contactNumber,
  email,
  onChange
}) => {
  const { data: appSettings } = useAppSettings();

  const handleAddressChange = (newAddress: string) => {
    // Create a synthetic event to maintain compatibility with existing onChange handler
    const syntheticEvent = {
      target: {
        name: 'address',
        value: newAddress
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onChange(syntheticEvent);
  };

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
          <GoogleMapsAddressInput
            value={address}
            onChange={handleAddressChange}
            label="Address"
            placeholder="Enter address or search with Google Maps"
            required
            apiKey={appSettings?.google_maps_api_key || undefined}
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
