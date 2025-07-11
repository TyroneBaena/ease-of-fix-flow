
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
      case 'approved': return 'bg-green-500 hover:bg-green-600 text-white';
      case 'rejected': return 'bg-red-500 hover:bg-red-600 text-white';
      case 'requested': return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'pending': return 'bg-blue-500 hover:bg-blue-600 text-white';
      default: return '';
    }
  };

  const formatSubmittedDate = () => {
    try {
      const date = new Date(submittedAt);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });
    } catch {
      return formatDistanceToNow(new Date(submittedAt), { addSuffix: true });
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
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <div className="flex items-center gap-2">
        <Badge 
          variant={status === 'approved' ? 'default' : 'secondary'} 
          className={`${getStatusColor(status)}`}
        >
          {status}
        </Badge>
        <span className="text-xs text-white">
          {status === 'requested' ? 'Requested ' : 'Submitted '}
          {formatSubmittedDate()}
        </span>
      </div>
    </div>
  );
};
