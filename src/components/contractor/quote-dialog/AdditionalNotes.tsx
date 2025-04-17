
import React from 'react';

interface AdditionalNotesProps {
  value: string;
  onChange: (value: string) => void;
}

export const AdditionalNotes = ({ value, onChange }: AdditionalNotesProps) => {
  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Additional Notes</h3>
      <textarea 
        className="w-full min-h-[80px] p-2 text-sm border rounded-md resize-y"
        placeholder="Add any specific instructions or details for the contractors..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};
