
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RentalFieldsProps } from '@/types/propertyForm';

export const RentalFields: React.FC<RentalFieldsProps> = ({
  renewalDate,
  rentAmount,
  rentPeriod,
  onChange,
  onRentPeriodChange
}) => {
  // Calculate the alternative rent amount for display
  const getAlternativeRentAmount = () => {
    if (rentAmount === 0) return 0;
    
    if (rentPeriod === 'week') {
      // Convert weekly to monthly (approximate)
      return (rentAmount * 52 / 12).toFixed(2);
    } else {
      // Convert monthly to weekly (approximate)
      return (rentAmount * 12 / 52).toFixed(2);
    }
  };

  return (
    <div className="space-y-4">
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
          <Label htmlFor="rentPeriod">Rent Period</Label>
          <Select value={rentPeriod} onValueChange={onRentPeriodChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select rent period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Per Week</SelectItem>
              <SelectItem value="month">Per Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="rentAmount">
            Rent Amount ({rentPeriod === 'week' ? 'Per Week' : 'Per Month'})
          </Label>
          <Input 
            id="rentAmount" 
            name="rentAmount"
            type="number"
            min="0"
            step="0.01"
            value={rentAmount} 
            onChange={onChange}
            placeholder={`Enter rent amount ${rentPeriod === 'week' ? 'per week' : 'per month'}`}
          />
          {rentAmount > 0 && (
            <p className="text-sm text-gray-600">
              Approximately ${getAlternativeRentAmount()} {rentPeriod === 'week' ? 'per month' : 'per week'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
