
import React from 'react';
import { Button } from "@/components/ui/button";
import { Check, X, UserCheck } from 'lucide-react';

interface QuoteActionsProps {
  status: string;
  onApprove: () => void;
  onReject: () => void;
}

export const QuoteActions = ({ status, onApprove, onReject }: QuoteActionsProps) => {
  if (status === 'approved') {
    return (
      <div className="flex items-center gap-2 pt-2 border-t bg-green-50 px-3 py-2 rounded-md">
        <UserCheck className="h-4 w-4 text-green-600" />
        <span className="text-green-700 font-medium text-sm">
          Contractor Assigned
        </span>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="flex items-center gap-2 pt-2 border-t bg-gray-50 px-3 py-2 rounded-md">
        <X className="h-4 w-4 text-gray-500" />
        <span className="text-gray-600 text-sm">
          Quote Not Accepted
        </span>
      </div>
    );
  }

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
