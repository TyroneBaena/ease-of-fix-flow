
import { useState, useEffect } from 'react';
import { useContractorContext } from '@/contexts/contractor';
import { supabase } from '@/integrations/supabase/client';

interface IncludeInfo {
  description: boolean;
  location: boolean;
  images: boolean;
  contactDetails: boolean;
  urgency: boolean;
}

export const useQuoteRequestDialog = (open: boolean, requestId?: string) => {
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);
  const [includeInfo, setIncludeInfo] = useState<IncludeInfo>({
    description: true,
    location: true,
    images: true,
    contactDetails: true,
    urgency: true
  });
  const [notes, setNotes] = useState('');
  const [isLoadingPreviousSelection, setIsLoadingPreviousSelection] = useState(false);
  const { contractors, loading, loadContractors } = useContractorContext();

  // Function to load previously selected contractors for this request
  const loadPreviousSelection = async (requestId: string) => {
    if (!requestId) return;
    
    setIsLoadingPreviousSelection(true);
    
    try {
      console.log("QuoteRequestDialog - Loading previous contractor selection for request:", requestId);
      
      // Get all quotes for this request to see which contractors were previously selected
      const { data: quotes, error } = await supabase
        .from('quotes')
        .select('contractor_id')
        .eq('request_id', requestId);

      if (error) {
        console.error("Error loading previous contractor selection:", error);
        return;
      }

      if (quotes && quotes.length > 0) {
        const previouslySelectedContractors = quotes.map(quote => quote.contractor_id);
        console.log("QuoteRequestDialog - Previously selected contractors:", previouslySelectedContractors);
        setSelectedContractors(previouslySelectedContractors);
      }
    } catch (error) {
      console.error("Error in loadPreviousSelection:", error);
    } finally {
      setIsLoadingPreviousSelection(false);
    }
  };

  // Load contractors and previous selection when dialog opens
  useEffect(() => {
    if (open) {
      console.log("QuoteRequestDialog - Dialog opened, loading contractors");
      loadContractors();
      
      // Reset form state
      setIncludeInfo({
        description: true,
        location: true,
        images: true,
        contactDetails: true,
        urgency: true
      });
      setNotes('');
      
      // Load previous selection if requestId is provided
      if (requestId) {
        loadPreviousSelection(requestId);
      } else {
        setSelectedContractors([]);
      }
    }
  }, [open, requestId, loadContractors]);

  // Debug logging for contractors
  useEffect(() => {
    console.log("QuoteRequestDialog - Contractors updated:", contractors);
    console.log("QuoteRequestDialog - Loading state:", loading);
  }, [contractors, loading]);

  const handleContractorSelection = (contractorId: string) => {
    setSelectedContractors(prev =>
      prev.includes(contractorId)
        ? prev.filter(id => id !== contractorId)
        : [...prev, contractorId]
    );
  };

  const handleInfoToggle = (infoType: string) => {
    setIncludeInfo(prev => ({
      ...prev,
      [infoType]: !prev[infoType as keyof typeof prev]
    }));
  };

  return {
    selectedContractors,
    includeInfo,
    notes,
    contractors,
    loading: loading || isLoadingPreviousSelection,
    setNotes,
    handleContractorSelection,
    handleInfoToggle
  };
};
