
import React from 'react';
import { Quote } from '@/types/contractor';
import { ContractorInfo } from './ContractorInfo';
import { QuoteDetails } from './QuoteDetails';
import { QuoteActions } from './QuoteActions';

interface ContractorInfoData {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
}

interface QuoteItemProps {
  quote: Quote;
  contractor: ContractorInfoData | undefined;
  loadingContractor: boolean;
  onApprove: (quoteId: string) => void;
  onReject: (quoteId: string) => void;
}

// Custom comparison function for QuoteItem
const arePropsEqual = (prevProps: QuoteItemProps, nextProps: QuoteItemProps) => {
  const prevQuote = prevProps.quote;
  const nextQuote = nextProps.quote;
  const prevContractor = prevProps.contractor;
  const nextContractor = nextProps.contractor;
  
  return (
    prevQuote.id === nextQuote.id &&
    prevQuote.amount === nextQuote.amount &&
    prevQuote.description === nextQuote.description &&
    prevQuote.status === nextQuote.status &&
    prevQuote.submittedAt === nextQuote.submittedAt &&
    prevProps.loadingContractor === nextProps.loadingContractor &&
    prevProps.onApprove === nextProps.onApprove &&
    prevProps.onReject === nextProps.onReject &&
    // Compare contractor data
    (prevContractor === nextContractor || (
      prevContractor?.id === nextContractor?.id &&
      prevContractor?.companyName === nextContractor?.companyName &&
      prevContractor?.contactName === nextContractor?.contactName &&
      prevContractor?.phone === nextContractor?.phone &&
      prevContractor?.email === nextContractor?.email
    ))
  );
};

export const QuoteItem = ({ 
  quote, 
  contractor, 
  loadingContractor, 
  onApprove, 
  onReject 
}: QuoteItemProps) => {
  return (
    <div className="p-4 border rounded-lg bg-background space-y-3">
      <ContractorInfo 
        contractor={contractor} 
        loading={loadingContractor} 
      />
      
      <QuoteDetails
        amount={quote.amount}
        description={quote.description}
        status={quote.status}
        submittedAt={quote.submittedAt}
      />
      
      <QuoteActions
        status={quote.status}
        onApprove={() => onApprove(quote.id)}
        onReject={() => onReject(quote.id)}
      />
    </div>
  );
};

export default React.memo(QuoteItem, arePropsEqual);
