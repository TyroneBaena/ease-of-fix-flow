
import React from 'react';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface RequestFormDescriptionProps {
  value: string;
  onChange: (value: string) => void;
}

export const RequestFormDescription = ({ value, onChange }: RequestFormDescriptionProps) => {
  return (
    <div>
      <Label htmlFor="description" className="text-base">Description</Label>
      <p className="text-sm text-gray-500 mb-2">
        Provide detailed information about the issue
      </p>
      <Textarea
        id="description"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Please include any relevant details such as when the issue started, any troubleshooting you've attempted, etc."
        className="min-h-[120px]"
        required
      />
    </div>
  );
};
