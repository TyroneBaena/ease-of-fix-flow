import React, { useState, useEffect, useCallback } from 'react';
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
import { toast } from '@/lib/toast';

interface ContractorAssignmentProps {
  requestId: string;
  isAssigned: boolean;
  currentContractorId?: string;
  onOpenQuoteDialog: () => void; // This is now specifically for requesting quotes, not submitting them
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
  const [assignmentComplete, setAssignmentComplete] = useState(false);
  const isReassignment = isAssigned && currentContractorId;
  const hasCalledParentRef = React.useRef(false);
  
  // Reset states when request ID changes
  useEffect(() => {
    console.log("ContractorAssignment - Request ID changed, resetting states");
    setIsAssigning(false);
    setAssignmentComplete(false);
    hasCalledParentRef.current = false;
    
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
  }, [requestId]);
  
  // Load contractors and set initial selection
  useEffect(() => {
    console.log("ContractorAssignment - Component mounted or updated");
    
    // Force load contractors when component mounts
    if (contractors.length === 0 && !loading) {
      console.log("ContractorAssignment - Forcing load of contractors");
      loadContractors();
    }
    
    // Set the currently assigned contractor as selected if we're in reassignment mode
    if (isReassignment && currentContractorId && !selectedContractor) {
      console.log("ContractorAssignment - Setting selected contractor to current:", currentContractorId);
      setSelectedContractor(currentContractorId);
    }
    // Otherwise set the first contractor as selected if available
    else if (contractors.length > 0 && !selectedContractor) {
      console.log("ContractorAssignment - Setting selected contractor to:", contractors[0].id);
      setSelectedContractor(contractors[0].id);
    }
  }, [contractors, isAssigned, loading, loadContractors, selectedContractor, currentContractorId, isReassignment]);

  // Memoized assignment handler to prevent recreation on every render
  const handleAssignment = useCallback(async () => {
    if (!selectedContractor) {
      toast.error("Please select a contractor first");
      return;
    }
    
    // Prevent rapid multiple submissions
    if (isAssigning || assignmentComplete) {
      console.log("ContractorAssignment - Assignment already in progress or completed, skipping");
      return;
    }
    
    try {
      setIsAssigning(true);
      
      if (isReassignment) {
        console.log("ContractorAssignment - Reassigning contractor:", selectedContractor);
        await changeAssignment(requestId, selectedContractor);
        console.log("ContractorAssignment - Reassignment successful");
        // Toast is triggered from the context function
      } else {
        console.log("ContractorAssignment - Assigning contractor:", selectedContractor);
        await assignContractor(requestId, selectedContractor);
        console.log("ContractorAssignment - Assignment successful");
        // Toast is triggered from the context function
      }
      
      // Mark the assignment as complete to prevent multiple calls
      setAssignmentComplete(true);
      setIsAssigning(false);
      
      // Strictly call parent refresh only once
      if (onContractorAssigned && !hasCalledParentRef.current) {
        hasCalledParentRef.current = true;
        console.log("ContractorAssignment - Triggering parent refresh ONCE with delay");
        
        // Use a longer delay to ensure all state updates have settled
        setTimeout(() => {
          if (onContractorAssigned) {
            onContractorAssigned();
          }
        }, 1000);
      }
      
    } catch (error) {
      console.error("Error assigning/reassigning contractor:", error);
      // Toast for error is already shown in the context function
      setIsAssigning(false);
      setAssignmentComplete(false);
    }
  }, [selectedContractor, isAssigning, assignmentComplete, isReassignment, changeAssignment, requestId, assignContractor, onContractorAssigned]);

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
          disabled={loading || contractors.length === 0 || isAssigning || assignmentComplete}
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
            disabled={
              !selectedContractor || 
              loading || 
              contractors.length === 0 || 
              isAssigning || 
              assignmentComplete
            }
            className="w-full"
          >
            {isAssigning ? 
              (isReassignment ? "Reassigning..." : "Assigning...") : 
              (assignmentComplete ? 
                (isReassignment ? "Contractor Changed" : "Contractor Assigned") :
                (isReassignment ? 
                  <span className="flex items-center"><RefreshCw className="mr-2 h-4 w-4" />Change Contractor</span> : 
                  "Assign Contractor"))}
          </Button>
          
          {!isReassignment && !assignmentComplete && (
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
