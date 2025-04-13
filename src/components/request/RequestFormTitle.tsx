
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface RequestFormTitleProps {
  value: string;
  onChange: (value: string) => void;
}

export const RequestFormTitle = ({ value, onChange }: RequestFormTitleProps) => {
  return (
    <div>
      <Label htmlFor="title" className="text-base">Title</Label>
      <p className="text-sm text-gray-500 mb-2">
        Provide a short description of the issue
      </p>
      <Input
        id="title"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g., Broken light fixture in conference room"
        required
      />
    </div>
  );
};
