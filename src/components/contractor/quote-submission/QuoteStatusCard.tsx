
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, DollarSign, FileText, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Quote {
  id: string;
  amount: number;
  description?: string;
  status: 'requested' | 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  createdAt: string;
}

interface QuoteStatusCardProps {
  quote: Quote | undefined;
  onResubmit: () => void;
  onBack: () => void;
}

export const QuoteStatusCard = ({ quote, onResubmit, onBack }: QuoteStatusCardProps) => {
  if (!quote) {
    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-4">No Quote Submitted</h2>
        <p className="text-gray-600 mb-6">You haven't submitted a quote for this request yet.</p>
        <Button onClick={onBack} variant="outline" className="w-full">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Your quote is under review. We will notify you once a decision is made.';
      case 'approved':
        return 'Congratulations! Your quote has been approved. You should receive further instructions soon.';
      case 'rejected':
        return 'Your quote was not accepted this time. You can submit a revised quote if you wish.';
      default:
        return 'Your quote has been submitted and is being processed.';
    }
  };

  const showResubmitOption = quote.status === 'rejected' || quote.status === 'pending';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-3">
          {getStatusIcon(quote.status)}
        </div>
        <h2 className="text-xl font-semibold mb-2">Quote Status</h2>
        <Badge className={getStatusColor(quote.status)}>
          {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="font-medium">Quote Amount</span>
          </div>
          <p className="text-2xl font-bold text-green-600">${quote.amount.toFixed(2)}</p>
        </div>

        {quote.description && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-gray-600" />
              <span className="font-medium">Description</span>
            </div>
            <p className="text-sm text-gray-700">{quote.description}</p>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            <strong>Submitted:</strong> {formatDistanceToNow(new Date(quote.submittedAt), { addSuffix: true })}
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          {getStatusMessage(quote.status)}
        </p>
      </div>

      <div className="space-y-3">
        {showResubmitOption && (
          <Button 
            onClick={onResubmit} 
            className="w-full"
            variant={quote.status === 'rejected' ? 'default' : 'outline'}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {quote.status === 'rejected' ? 'Submit New Quote' : 'Update Quote'}
          </Button>
        )}
        
        <Button onClick={onBack} variant="outline" className="w-full">
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
};
