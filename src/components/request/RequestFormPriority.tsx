
import React from 'react';
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface RequestFormPriorityProps {
  value: string;
  onChange: (value: string) => void;
}

export const RequestFormPriority = ({ value, onChange }: RequestFormPriorityProps) => {
  return (
    <div>
      <Label className="text-base">Priority Level</Label>
      <p className="text-sm text-gray-500 mb-3">
        How urgent is this request?
      </p>
      <RadioGroup 
        value={value} 
        onValueChange={onChange}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="low" id="low" />
          <Label htmlFor="low" className="cursor-pointer">Low</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="medium" id="medium" />
          <Label htmlFor="medium" className="cursor-pointer">Medium</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="high" id="high" />
          <Label htmlFor="high" className="cursor-pointer">High</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="critical" id="critical" />
          <Label htmlFor="critical" className="cursor-pointer">Critical</Label>
        </div>
      </RadioGroup>
    </div>
  );
};
