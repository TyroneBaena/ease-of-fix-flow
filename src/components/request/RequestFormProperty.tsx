
import React from 'react';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      <p className="text-sm text-muted-foreground mb-2">
        Select the property this request is for
      </p>
      
      <Select value={value} onValueChange={onChange} required disabled={properties.length === 0}>
        <SelectTrigger>
          <SelectValue placeholder={properties.length === 0 ? "No properties available" : "Select property"} />
        </SelectTrigger>
        <SelectContent>
          {properties.map((property) => (
            <SelectItem key={property.id} value={property.id}>
              {property.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
