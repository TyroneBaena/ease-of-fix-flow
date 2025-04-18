
import React, { useState } from 'react';
import { ContractorProvider, useContractorContext } from '@/contexts/contractor';
import { ContractorAssignment } from './ContractorAssignment';
import { QuotesList } from './QuotesList';
import { Quote } from '@/types/contractor';
import { RequestQuoteDialog } from '@/components/contractor/RequestQuoteDialog';
import { supabase } from '@/lib/supabase';

interface QuoteSectionProps {
  request: {
    id: string;
    contractor_id?: string;
  };
  quotes: Quote[];
  setQuotes: React.Dispatch<React.SetStateAction<Quote[]>>;
}

const QuoteDialogWithContext = ({ 
  request, 
  quotes, 
  setQuotes, 
  quoteDialogOpen, 
  setQuoteDialogOpen 
}: QuoteSectionProps & {
  quoteDialogOpen: boolean;
  setQuoteDialogOpen: (open: boolean) => void;
}) => {
  const { submitQuote } = useContractorContext();
  
  const handleSubmitQuote = async (amount: number, description: string) => {
    try {
      await submitQuote(request.id, amount, description);
      // Refresh quotes after submission
      const fetchQuotes = async () => {
        const { data, error } = await supabase
          .from('quotes')
          .select('*')
          .eq('request_id', request.id)
          .order('created_at', { ascending: false });
          
        if (!error && data) {
          const mappedQuotes: Quote[] = data.map(quote => ({
            id: quote.id,
            requestId: quote.request_id,
            contractorId: quote.contractor_id,
            amount: quote.amount,
            description: quote.description || undefined,
            status: quote.status as 'pending' | 'approved' | 'rejected',
            submittedAt: quote.submitted_at,
            approvedAt: quote.approved_at || undefined,
            createdAt: quote.created_at,
            updatedAt: quote.updated_at
          }));
          
          setQuotes(mappedQuotes);
        }
      };
      fetchQuotes();
    } catch (error) {
      console.error('Error submitting quote:', error);
    }
  };
  
  return (
    <>
      <ContractorAssignment 
        requestId={request.id} 
        isAssigned={!!request.contractor_id}
        onOpenQuoteDialog={() => setQuoteDialogOpen(true)}
      />
      
      <QuotesList requestId={request.id} quotes={quotes} />
      
      <RequestQuoteDialog 
        open={quoteDialogOpen} 
        onOpenChange={setQuoteDialogOpen} 
        requestDetails={request}
        onSubmitQuote={handleSubmitQuote}
      />
    </>
  );
};

export const QuoteSection: React.FC<QuoteSectionProps> = ({ request, quotes, setQuotes }) => {
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);

  return (
    <ContractorProvider>
      <QuoteDialogWithContext 
        request={request}
        quotes={quotes}
        setQuotes={setQuotes}
        quoteDialogOpen={quoteDialogOpen}
        setQuoteDialogOpen={setQuoteDialogOpen}
      />
    </ContractorProvider>
  );
};
