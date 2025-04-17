
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCheck, DollarSign } from 'lucide-react';
import { Quote } from '@/types/contractor';
import { useContractorContext } from '@/contexts/contractor';
import { toast } from '@/lib/toast';

interface QuotesListProps {
  requestId: string;
  quotes?: Quote[];
}

export const QuotesList = ({ requestId, quotes = [] }: QuotesListProps) => {
  const { approveQuote } = useContractorContext();

  const handleApproveQuote = async (quoteId: string) => {
    try {
      await approveQuote(quoteId);
      toast.success('Quote approved successfully');
    } catch (error) {
      toast.error('Failed to approve quote');
    }
  };

  if (quotes.length === 0) {
    return null;
  }

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
            className="flex items-center justify-between p-4 border rounded-lg bg-background"
          >
            <div className="space-y-1">
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-1" />
                <span className="font-medium">${quote.amount}</span>
              </div>
              {quote.description && (
                <p className="text-sm text-muted-foreground">{quote.description}</p>
              )}
              <div className="flex items-center space-x-2">
                <Badge variant={quote.status === 'approved' ? 'success' : 'secondary'}>
                  {quote.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Submitted {new Date(quote.submittedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            {quote.status === 'pending' && (
              <Button 
                variant="outline" 
                className="ml-4"
                onClick={() => handleApproveQuote(quote.id)}
              >
                Approve Quote
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
