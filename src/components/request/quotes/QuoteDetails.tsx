
import React from 'react';
import { DollarSign } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';

interface QuoteDetailsProps {
  amount: number;
  description?: string;
  status: string;
  submittedAt: string;
}

export const QuoteDetails = ({ amount, description, status, submittedAt }: QuoteDetailsProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500 hover:bg-green-600';
      case 'rejected': return 'bg-red-500 hover:bg-red-600';
      case 'requested': return 'bg-blue-500 hover:bg-blue-600';
      default: return '';
    }
  };

  return (
    <div className="space-y-2 border-t pt-3">
      {/* Only show amount if status is not 'requested' */}
      {status !== 'requested' && (
        <div className="flex items-center">
          <DollarSign className="h-4 w-4 mr-1" />
          <span className="font-medium">${amount}</span>
        </div>
      )}
      {description && (
        <p className="text-sm text-white">{description}</p>
      )}
      <div className="flex items-center gap-2">
        <Badge 
          variant={status === 'approved' ? 'default' : 'secondary'} 
          className={`${getStatusColor(status)}`}
        >
          {status}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {status === 'requested' ? 'Requested ' : 'Submitted '}
          {formatDistanceToNow(new Date(submittedAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
};
