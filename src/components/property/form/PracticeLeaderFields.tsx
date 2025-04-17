import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PracticeLeaderFieldsProps } from '@/types/propertyForm';

export const PracticeLeaderFields: React.FC<PracticeLeaderFieldsProps> = ({
  managers,
  practiceLeader,
  practiceLeaderEmail,
  practiceLeaderPhone,
  onPracticeLeaderChange,
  onChange
}) => {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="practiceLeader">Practice Leader*</Label>
        <Select
          value={managers.find(m => m.name === practiceLeader)?.id}
          onValueChange={onPracticeLeaderChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a practice leader" />
          </SelectTrigger>
          <SelectContent>
            {managers.map((manager) => (
              <SelectItem key={manager.id} value={manager.id}>
                {manager.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="practiceLeaderEmail">Leader Email</Label>
          <Input 
            id="practiceLeaderEmail" 
            name="practiceLeaderEmail"
            type="email"
            value={practiceLeaderEmail} 
            onChange={onChange}
            readOnly 
            className="bg-gray-100"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="practiceLeaderPhone">Leader Phone</Label>
          <Input 
            id="practiceLeaderPhone" 
            name="practiceLeaderPhone"
            value={practiceLeaderPhone} 
            onChange={onChange} 
          />
        </div>
      </div>
    </>
  );
};
