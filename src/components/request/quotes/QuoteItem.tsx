
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
