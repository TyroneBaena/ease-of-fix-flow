
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useContractorContext } from '@/contexts/contractor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { HardHat, Quote } from 'lucide-react';

interface ContractorAssignmentProps {
  requestId: string;
  isAssigned: boolean;
  onOpenQuoteDialog: () => void;
}

export const ContractorAssignment: React.FC<ContractorAssignmentProps> = ({
  requestId,
  isAssigned,
  onOpenQuoteDialog
}) => {
  const { contractors, loading, assignContractor, error } = useContractorContext();
  const [selectedContractor, setSelectedContractor] = useState<string>('');
  
  // Enhanced logging
  useEffect(() => {
    console.log("ContractorAssignment - Component mounted or updated");
    console.log("ContractorAssignment - Props:", { requestId, isAssigned });
    console.log("ContractorAssignment - Available contractors:", contractors);
    console.log("ContractorAssignment - Loading state:", loading);
    console.log("ContractorAssignment - Error state:", error);
    
    // Reset selected contractor when the component mounts or contractors change
    if (contractors.length > 0 && !selectedContractor) {
      setSelectedContractor(contractors[0].id);
    }
  }, [contractors, requestId, isAssigned, loading, error, selectedContractor]);

  const handleAssignment = async () => {
    if (!selectedContractor) return;
    try {
      console.log("ContractorAssignment - Assigning contractor:", selectedContractor);
      await assignContractor(requestId, selectedContractor);
      console.log("ContractorAssignment - Assignment successful");
    } catch (error) {
      console.error("Error assigning contractor:", error);
    }
  };

  // If explicitly assigned, don't render the component
  if (isAssigned) {
    console.log("ContractorAssignment - Component hidden because isAssigned is true");
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg font-semibold">
          <HardHat className="mr-2 h-5 w-5" />
          Contractor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select
          value={selectedContractor}
          onValueChange={setSelectedContractor}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a contractor" />
          </SelectTrigger>
          <SelectContent>
            {loading ? (
              <SelectItem value="loading" disabled>Loading contractors...</SelectItem>
            ) : contractors.length === 0 ? (
              <SelectItem value="none" disabled>No contractors available</SelectItem>
            ) : (
              contractors.map((contractor) => (
                <SelectItem key={contractor.id} value={contractor.id}>
                  {contractor.companyName}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={handleAssignment}
            disabled={!selectedContractor || loading || contractors.length === 0}
            className="w-full"
          >
            Assign Contractor
          </Button>
          
          <Button 
            variant="outline"
            onClick={onOpenQuoteDialog}
            className="w-full flex items-center justify-center"
          >
            <Quote className="mr-2 h-4 w-4" />
            Request Quote
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
