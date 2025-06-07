
import React from 'react';
import { Button } from "@/components/ui/button";
import { Check, X } from 'lucide-react';

interface QuoteActionsProps {
  status: string;
  onApprove: () => void;
  onReject: () => void;
}

export const QuoteActions = ({ status, onApprove, onReject }: QuoteActionsProps) => {
  if (status !== 'pending') {
    return null;
  }

  return (
    <div className="flex gap-2 pt-2 border-t">
      <Button 
        variant="outline" 
        size="sm"
        className="bg-green-50 hover:bg-green-100 border-green-200"
        onClick={onApprove}
      >
        <Check className="h-4 w-4 mr-1" />
        Approve
      </Button>
      <Button 
        variant="outline"
        size="sm"
        className="bg-red-50 hover:bg-red-100 border-red-200"
        onClick={onReject}
      >
        <X className="h-4 w-4 mr-1" />
        Reject
      </Button>
    </div>
  );
};
