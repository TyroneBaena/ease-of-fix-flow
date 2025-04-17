
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RentalFieldsProps {
  renewalDate: string;
  rentAmount: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const RentalFields: React.FC<RentalFieldsProps> = ({
  renewalDate,
  rentAmount,
  onChange
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="renewalDate">Rental Agreement Renewal Date</Label>
        <Input 
          id="renewalDate" 
          name="renewalDate"
          type="date"
          value={renewalDate} 
          onChange={onChange} 
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
          value={rentAmount} 
          onChange={onChange} 
        />
      </div>
    </div>
  );
};
