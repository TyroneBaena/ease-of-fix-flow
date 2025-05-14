
import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface AdditionalNotesProps {
  value: string;
  onChange: (value: string) => void;
}

export const AdditionalNotes = ({ value, onChange }: AdditionalNotesProps) => {
  return (
    <div>
      <h3 className="text-sm font-medium mb-3">Additional Notes</h3>
      <Textarea
        placeholder="Add any additional notes or requirements for the contractor..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[100px]"
      />
    </div>
  );
};
