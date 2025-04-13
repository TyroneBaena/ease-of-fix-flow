
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin } from 'lucide-react';

interface RequestFormCategoryLocationProps {
  category: string;
  location: string;
  onCategoryChange: (value: string) => void;
  onLocationChange: (value: string) => void;
}

export const RequestFormCategoryLocation = ({ 
  category, 
  location, 
  onCategoryChange, 
  onLocationChange 
}: RequestFormCategoryLocationProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <Label htmlFor="category" className="text-base">Category</Label>
        <p className="text-sm text-gray-500 mb-2">
          Select the type of issue
        </p>
        <Select value={category} onValueChange={onCategoryChange} required>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="plumbing">Plumbing</SelectItem>
            <SelectItem value="electrical">Electrical</SelectItem>
            <SelectItem value="hvac">HVAC</SelectItem>
            <SelectItem value="structural">Structural</SelectItem>
            <SelectItem value="appliance">Appliance</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="location" className="text-base">Location</Label>
        <p className="text-sm text-gray-500 mb-2">
          Where is the issue located?
        </p>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="location"
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            className="pl-10"
            placeholder="e.g., Building A, Room 203"
            required
          />
        </div>
      </div>
    </div>
  );
};
