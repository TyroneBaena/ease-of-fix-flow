
import { useState, useEffect } from 'react';
import { useContractorContext } from '@/contexts/contractor';

interface IncludeInfo {
  description: boolean;
  location: boolean;
  images: boolean;
  contactDetails: boolean;
  urgency: boolean;
}

export const useQuoteRequestDialog = (open: boolean) => {
  const [selectedContractors, setSelectedContractors] = useState<string[]>([]);
  const [includeInfo, setIncludeInfo] = useState<IncludeInfo>({
    description: true,
    location: true,
    images: true,
    contactDetails: true,
    urgency: true
  });
  const [notes, setNotes] = useState('');
  const { contractors, loading, loadContractors } = useContractorContext();

  // Load contractors when dialog opens
  useEffect(() => {
    if (open) {
      console.log("QuoteRequestDialog - Dialog opened, loading contractors");
      loadContractors();
      setSelectedContractors([]);
      setIncludeInfo({
        description: true,
        location: true,
        images: true,
        contactDetails: true,
        urgency: true
      });
      setNotes('');
    }
  }, [open, loadContractors]);

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
    loading,
    setNotes,
    handleContractorSelection,
    handleInfoToggle
  };
};
