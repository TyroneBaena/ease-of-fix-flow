import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCheck, DollarSign, Check, X, Building2, User, Phone } from 'lucide-react';
import { Quote } from '@/types/contractor';
import { useContractorContext } from '@/contexts/contractor';
import { toast } from '@/lib/toast';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface QuotesListProps {
  requestId: string;
  quotes?: Quote[];
  onDataChange?: () => void; // New prop for refreshing data
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
      // Refresh the page data after successful approval
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
      // Refresh the page data after successful rejection
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
        {quotes.map((quote) => {
          const contractor = contractorsMap[quote.contractorId];
          
          return (
            <div
              key={quote.id}
              className="p-4 border rounded-lg bg-background space-y-3"
            >
              {/* Contractor Information */}
              {loadingContractors ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              ) : contractor ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-gray-900">{contractor.companyName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{contractor.contactName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span>{contractor.phone}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Contractor information unavailable
                </div>
              )}

              {/* Quote Details */}
              <div className="space-y-2 border-t pt-3">
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

              {/* Action Buttons */}
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
          );
        })}
      </CardContent>
    </Card>
  );
};
