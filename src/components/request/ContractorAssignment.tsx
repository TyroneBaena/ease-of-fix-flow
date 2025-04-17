
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Contractor } from '@/types/contractor';
import { useContractorContext } from '@/contexts/contractor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { HardHat } from 'lucide-react';

interface ContractorAssignmentProps {
  requestId: string;
  isAssigned: boolean;
}

export const ContractorAssignment: React.FC<ContractorAssignmentProps> = ({
  requestId,
  isAssigned
}) => {
  const { contractors, assignContractor, requestQuote } = useContractorContext();
  const [selectedContractor, setSelectedContractor] = useState<string>('');
  const [isQuoteRequest, setIsQuoteRequest] = useState(false);

  const handleAssignment = async () => {
    if (!selectedContractor) return;

    try {
      if (isQuoteRequest) {
        await requestQuote(requestId, selectedContractor);
      } else {
        await assignContractor(requestId, selectedContractor);
      }
    } catch (error) {
      console.error('Error in contractor assignment:', error);
    }
  };

  if (isAssigned) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg font-semibold">
          <HardHat className="mr-2 h-5 w-5" />
          Assign Contractor
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
            {contractors.map((contractor) => (
              <SelectItem key={contractor.id} value={contractor.id}>
                {contractor.companyName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsQuoteRequest(!isQuoteRequest)}
          >
            {isQuoteRequest ? 'Direct Assignment' : 'Request Quote'}
          </Button>
          <Button
            disabled={!selectedContractor}
            onClick={handleAssignment}
          >
            {isQuoteRequest ? 'Request Quote' : 'Assign Contractor'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
