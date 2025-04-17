
import React, { useState } from 'react';
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
  const { contractors, assignContractor } = useContractorContext();
  const [selectedContractor, setSelectedContractor] = useState<string>('');

  const handleAssignment = async () => {
    if (!selectedContractor) return;
    await assignContractor(requestId, selectedContractor);
  };

  if (isAssigned) {
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
            {contractors.map((contractor) => (
              <SelectItem key={contractor.id} value={contractor.id}>
                {contractor.companyName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={handleAssignment}
            disabled={!selectedContractor}
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
