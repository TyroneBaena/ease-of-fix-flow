
import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building } from 'lucide-react';
import { Property } from '@/types/property';

interface RequestFormPropertyProps {
  value: string;
  onChange: (value: string) => void;
  properties: Property[];
}

export const RequestFormProperty = ({ 
  value,
  onChange,
  properties
}: RequestFormPropertyProps) => {
  return (
    <div>
      <Label htmlFor="property" className="text-base">Property*</Label>
      <p className="text-sm text-gray-500 mb-2">
        Select the property this request is for
      </p>
      
      {properties.length === 0 ? (
        <div className="p-4 border rounded-md bg-yellow-50 text-yellow-800">
          <div className="flex items-center">
            <Building className="h-5 w-5 mr-2" />
            <p className="font-medium">No properties available</p>
          </div>
          <p className="mt-1 text-sm">
            You need to add properties first before creating maintenance requests.
          </p>
        </div>
      ) : (
        <Select value={value} onValueChange={onChange} required>
          <SelectTrigger>
            <SelectValue placeholder="Select property" />
          </SelectTrigger>
          <SelectContent>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id}>
                {property.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};
