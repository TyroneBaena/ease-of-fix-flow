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
import { HardHat, Quote, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface ContractorAssignmentProps {
  requestId: string;
  isAssigned: boolean;
  currentContractorId?: string;
  onOpenQuoteDialog: () => void;
  onContractorAssigned?: () => void; // Callback for when a contractor is assigned
}

export const ContractorAssignment: React.FC<ContractorAssignmentProps> = ({
  requestId,
  isAssigned,
  currentContractorId,
  onOpenQuoteDialog,
  onContractorAssigned
}) => {
  const { contractors, loading, assignContractor, changeAssignment, error, loadContractors } = useContractorContext();
  const [selectedContractor, setSelectedContractor] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const isReassignment = isAssigned && currentContractorId;
  
  // Enhanced logging
  useEffect(() => {
    console.log("ContractorAssignment - Component mounted or updated");
    console.log("ContractorAssignment - Props:", { requestId, isAssigned, currentContractorId });
    console.log("ContractorAssignment - Available contractors:", contractors);
    console.log("ContractorAssignment - Loading state:", loading);
    console.log("ContractorAssignment - Error state:", error);
    
    // Force load contractors when component mounts
    if (contractors.length === 0 && !loading) {
      console.log("ContractorAssignment - Forcing load of contractors");
      loadContractors();
    }
    
    // Set the currently assigned contractor as selected if we're in reassignment mode
    if (isReassignment && currentContractorId) {
      console.log("ContractorAssignment - Setting selected contractor to current:", currentContractorId);
      setSelectedContractor(currentContractorId);
    }
    // Otherwise set the first contractor as selected if available
    else if (contractors.length > 0 && !selectedContractor) {
      console.log("ContractorAssignment - Setting selected contractor to:", contractors[0].id);
      setSelectedContractor(contractors[0].id);
    }
  }, [contractors, requestId, isAssigned, loading, error, loadContractors, selectedContractor, currentContractorId, isReassignment]);

  const handleAssignment = async () => {
    if (!selectedContractor) {
      toast.error("Please select a contractor first");
      return;
    }
    
    // Prevent rapid multiple submissions
    if (isAssigning) {
      console.log("ContractorAssignment - Assignment already in progress, skipping");
      return;
    }
    
    try {
      setIsAssigning(true);
      
      if (isReassignment) {
        console.log("ContractorAssignment - Reassigning contractor:", selectedContractor);
        await changeAssignment(requestId, selectedContractor);
        console.log("ContractorAssignment - Reassignment successful");
        toast.success("Contractor reassigned successfully");
      } else {
        console.log("ContractorAssignment - Assigning contractor:", selectedContractor);
        await assignContractor(requestId, selectedContractor);
        console.log("ContractorAssignment - Assignment successful");
        toast.success("Contractor assigned successfully");
      }
      
      // Call the callback to notify parent component with a delay
      // This helps prevent rapid refresh cycles
      if (onContractorAssigned) {
        setTimeout(() => {
          onContractorAssigned();
          // Reset the assigning flag after a delay to allow time for the refresh to complete
          setTimeout(() => {
            setIsAssigning(false);
          }, 1000);
        }, 500);
      } else {
        // Reset the assigning flag if there's no callback
        setTimeout(() => {
          setIsAssigning(false);
        }, 1000);
      }
    } catch (error) {
      console.error("Error assigning/reassigning contractor:", error);
      toast.error(`Failed to ${isReassignment ? 'reassign' : 'assign'} contractor`);
      setIsAssigning(false);
    }
  };

  // Display even if assigned when in reassignment mode
  if (isAssigned && !isReassignment) {
    console.log("ContractorAssignment - Component hidden because isAssigned is true and not in reassignment mode");
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg font-semibold">
          <HardHat className="mr-2 h-5 w-5" />
          {isReassignment ? 'Change Contractor' : 'Contractor'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select
          value={selectedContractor}
          onValueChange={setSelectedContractor}
          disabled={loading || contractors.length === 0 || isAssigning}
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
            disabled={!selectedContractor || loading || contractors.length === 0 || isAssigning}
            className="w-full"
          >
            {isAssigning ? 
              (isReassignment ? "Reassigning..." : "Assigning...") : 
              (loading ? "Loading..." : (isReassignment ? 
                <span className="flex items-center"><RefreshCw className="mr-2 h-4 w-4" />Change Contractor</span> : 
                "Assign Contractor"))}
          </Button>
          
          {!isReassignment && (
            <Button 
              variant="outline"
              onClick={onOpenQuoteDialog}
              className="w-full flex items-center justify-center"
              disabled={isAssigning}
            >
              <Quote className="mr-2 h-4 w-4" />
              Request Quote
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
