
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Quote {
  id: string;
  amount: number;
  description?: string;
  status: 'requested' | 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  createdAt: string;
}

interface ContractorQuoteHistoryProps {
  quotes: Quote[];
  loading?: boolean;
}

export const ContractorQuoteHistory = ({ quotes, loading }: ContractorQuoteHistoryProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'requested':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionText = (quote: Quote) => {
    if (quote.status === 'requested') {
      return 'Quote was requested';
    }
    return 'Quote submitted';
  };

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Your Quote History</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (quotes.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Your Quote History</h3>
        <div className="text-center py-6 text-gray-500">
          <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No quotes submitted yet</p>
          <p className="text-xs mt-1">Your quote submissions will appear here</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Your Quote History</h3>
      <div className="space-y-4">
        {quotes.map((quote) => (
          <div key={quote.id} className="border-l-4 border-blue-200 pl-4 py-3 bg-gray-50 rounded-r">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">{getActionText(quote)}</span>
                <Badge className={getStatusColor(quote.status)}>
                  {quote.status}
                </Badge>
              </div>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(quote.submittedAt), { addSuffix: true })}
              </span>
            </div>
            
            {quote.status !== 'requested' && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Amount: ${quote.amount.toFixed(2)}</span>
                </div>
                
                {quote.description && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Description: </span>
                    {quote.description}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
