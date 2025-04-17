
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Contractor } from '@/types/contractor';

interface ContractorSelectionProps {
  contractors: Contractor[];
  selectedContractors: string[];
  onContractorSelection: (contractorId: string) => void;
  loading: boolean;
}

export const ContractorSelection = ({ 
  contractors,
  selectedContractors,
  onContractorSelection,
  loading
}: ContractorSelectionProps) => {
  return (
    <div>
      <h3 className="text-sm font-medium mb-3">Select Contractors</h3>
      
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading contractors...</div>
      ) : contractors.length === 0 ? (
        <div className="text-sm text-muted-foreground">No contractors available</div>
      ) : (
        <div className="space-y-2">
          {contractors.map((contractor) => (
            <div key={contractor.id} className="flex items-center space-x-2">
              <Checkbox
                id={`contractor-${contractor.id}`}
                checked={selectedContractors.includes(contractor.id)}
                onCheckedChange={() => onContractorSelection(contractor.id)}
              />
              <Label 
                htmlFor={`contractor-${contractor.id}`}
                className="flex flex-col cursor-pointer"
              >
                <span>{contractor.companyName}</span>
                <span className="text-xs text-muted-foreground">
                  {contractor.contactName} ({contractor.email})
                </span>
              </Label>
            </div>
          ))}
        </div>
      )}
      
      {selectedContractors.length > 0 && (
        <div className="mt-2 text-sm text-muted-foreground">
          {selectedContractors.length} contractor(s) selected
        </div>
      )}
    </div>
  );
};
