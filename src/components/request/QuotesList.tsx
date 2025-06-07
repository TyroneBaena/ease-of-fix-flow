
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCheck, DollarSign, Check, X } from 'lucide-react';
import { Quote } from '@/types/contractor';
import { useContractorContext } from '@/contexts/contractor';
import { toast } from '@/lib/toast';
import { formatDistanceToNow } from 'date-fns';

interface QuotesListProps {
  requestId: string;
  quotes?: Quote[];
}

export const QuotesList = ({ requestId, quotes = [] }: QuotesListProps) => {
  const { approveQuote, rejectQuote } = useContractorContext();

  const handleApproveQuote = async (quoteId: string) => {
    try {
      await approveQuote(quoteId);
      toast.success('Quote approved successfully');
    } catch (error) {
      toast.error('Failed to approve quote');
    }
  };
  
  const handleRejectQuote = async (quoteId: string) => {
    try {
      await rejectQuote(quoteId);
      toast.success('Quote rejected');
    } catch (error) {
      toast.error('Failed to reject quote');
    }
  };

  if (quotes.length === 0) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500 hover:bg-green-600';
      case 'rejected': return 'bg-red-500 hover:bg-red-600';
      case 'requested': return 'bg-blue-500 hover:bg-blue-600';
      default: return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg font-semibold">
          <FileCheck className="mr-2 h-5 w-5" />
          Submitted Quotes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {quotes.map((quote) => (
          <div
            key={quote.id}
            className="p-4 border rounded-lg bg-background space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                <span className="font-medium">${quote.amount}</span>
              </div>
              {quote.description && (
                <p className="text-sm text-muted-foreground">{quote.description}</p>
              )}
              <div className="flex items-center gap-2">
                <Badge 
                  variant={quote.status === 'approved' ? 'default' : 'secondary'} 
                  className={`${getStatusColor(quote.status)}`}
                >
                  {quote.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {quote.status === 'requested' ? 'Requested ' : 'Submitted '}
                  {formatDistanceToNow(new Date(quote.submittedAt), { addSuffix: true })}
                </span>
              </div>
            </div>
            {quote.status === 'pending' && (
              <div className="flex gap-2 pt-2 border-t">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="bg-green-50 hover:bg-green-100 border-green-200"
                  onClick={() => handleApproveQuote(quote.id)}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  className="bg-red-50 hover:bg-red-100 border-red-200"
                  onClick={() => handleRejectQuote(quote.id)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
