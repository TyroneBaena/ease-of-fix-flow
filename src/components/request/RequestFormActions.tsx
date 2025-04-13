
import React from 'react';
import { Button } from "@/components/ui/button";

interface RequestFormActionsProps {
  isSubmitting: boolean;
  onCancel: () => void;
}

export const RequestFormActions = ({ isSubmitting, onCancel }: RequestFormActionsProps) => {
  return (
    <div className="flex justify-end space-x-3 pt-4">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button 
        type="submit"
        disabled={isSubmitting}
        className="bg-blue-500 hover:bg-blue-600"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Request'}
      </Button>
    </div>
  );
};
