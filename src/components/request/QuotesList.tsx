
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FileCheck } from 'lucide-react';
import { Quote } from '@/types/contractor';
import { useContractorContext } from '@/contexts/contractor';
import { toast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { QuoteItem } from './quotes/QuoteItem';

interface QuotesListProps {
  requestId: string;
  quotes?: Quote[];
  onDataChange?: () => void;
}

interface ContractorInfo {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
}

export const QuotesList = ({ requestId, quotes = [], onDataChange }: QuotesListProps) => {
  const { approveQuote, rejectQuote } = useContractorContext();
  const [contractorsMap, setContractorsMap] = useState<Record<string, ContractorInfo>>({});
  const [loadingContractors, setLoadingContractors] = useState(true);

  // Fetch contractor details for all quotes
  useEffect(() => {
    const fetchContractorDetails = async () => {
      if (quotes.length === 0) {
        setLoadingContractors(false);
        return;
      }

      try {
        const contractorIds = [...new Set(quotes.map(quote => quote.contractorId))];
        
        const { data, error } = await supabase
          .from('contractors')
          .select('id, company_name, contact_name, phone, email')
          .in('id', contractorIds);

        if (error) {
          console.error('Error fetching contractors:', error);
          toast.error('Failed to load contractor details');
          return;
        }

        const contractorsById = data.reduce((acc, contractor) => {
          acc[contractor.id] = {
            id: contractor.id,
            companyName: contractor.company_name,
            contactName: contractor.contact_name,
            phone: contractor.phone,
            email: contractor.email
          };
          return acc;
        }, {} as Record<string, ContractorInfo>);

        setContractorsMap(contractorsById);
      } catch (error) {
        console.error('Error fetching contractor details:', error);
        toast.error('Failed to load contractor information');
      } finally {
        setLoadingContractors(false);
      }
    };

    fetchContractorDetails();
  }, [quotes]);

  const handleApproveQuote = async (quoteId: string) => {
    try {
      await approveQuote(quoteId);
      toast.success('Quote approved successfully');
      if (onDataChange) {
        onDataChange();
      }
    } catch (error) {
      toast.error('Failed to approve quote');
    }
  };
  
  const handleRejectQuote = async (quoteId: string) => {
    try {
      await rejectQuote(quoteId);
      toast.success('Quote rejected');
      if (onDataChange) {
        onDataChange();
      }
    } catch (error) {
      toast.error('Failed to reject quote');
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
          <QuoteItem
            key={quote.id}
            quote={quote}
            contractor={contractorsMap[quote.contractorId]}
            loadingContractor={loadingContractors}
            onApprove={handleApproveQuote}
            onReject={handleRejectQuote}
          />
        ))}
      </CardContent>
    </Card>
  );
};
