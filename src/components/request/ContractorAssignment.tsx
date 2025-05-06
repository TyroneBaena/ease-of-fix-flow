
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
  const { contractors, loading, assignContractor } = useContractorContext();
  const [selectedContractor, setSelectedContractor] = useState<string>('');
  const [shouldShow, setShouldShow] = useState(!isAssigned);

  useEffect(() => {
    // Log when props change to help debug
    console.log("ContractorAssignment - Props changed:", { requestId, isAssigned });
    console.log("ContractorAssignment - Available contractors:", contractors);
    
    // Only update visibility if isAssigned changes
    setShouldShow(!isAssigned);
  }, [isAssigned, contractors, requestId]);

  const handleAssignment = async () => {
    if (!selectedContractor) return;
    try {
      await assignContractor(requestId, selectedContractor);
    } catch (error) {
      console.error("Error assigning contractor:", error);
    }
  };

  // If explicitly assigned, don't render the component
  // Important: We use the state variable here to prevent immediate unmounting issues
  if (shouldShow === false) {
    console.log("ContractorAssignment - Component hidden because shouldShow is false");
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
            disabled={!selectedContractor || loading}
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
