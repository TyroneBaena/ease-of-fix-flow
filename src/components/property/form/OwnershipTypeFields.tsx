import React from 'react';
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Home } from 'lucide-react';

interface OwnershipTypeFieldsProps {
  ownershipType: 'sda' | 'rented' | 'owned';
  onOwnershipTypeChange: (value: 'sda' | 'rented' | 'owned') => void;
}

const ownershipTypeLabels: Record<'sda' | 'rented' | 'owned', string> = {
  sda: 'SDA (Specialist Disability Accommodation)',
  rented: 'Rented',
  owned: 'Owned',
};

export const OwnershipTypeFields: React.FC<OwnershipTypeFieldsProps> = ({
  ownershipType,
  onOwnershipTypeChange,
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="ownershipType" className="flex items-center gap-2">
        <Home className="h-4 w-4" />
        Property Type
      </Label>
      <Select value={ownershipType} onValueChange={onOwnershipTypeChange}>
        <SelectTrigger id="ownershipType">
          <SelectValue placeholder="Select property type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="sda">{ownershipTypeLabels.sda}</SelectItem>
          <SelectItem value="rented">{ownershipTypeLabels.rented}</SelectItem>
          <SelectItem value="owned">{ownershipTypeLabels.owned}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
