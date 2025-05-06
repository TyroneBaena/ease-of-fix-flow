
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, RefreshCcw } from 'lucide-react';
import { useContractorContext } from '@/contexts/contractor/ContractorContext';
import { toast } from '@/lib/toast';

interface RequestActionsProps {
  status: string;
  requestId: string;
  onStatusChange?: () => void;
}

export const RequestActions = ({ status, requestId, onStatusChange }: RequestActionsProps) => {
  const { updateJobProgress } = useContractorContext();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCompleteRequest = async () => {
    // Prevent multiple rapid clicks
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      if (status === 'completed') {
        // Reopen request by setting progress back to a partial value (e.g., 50%)
        await updateJobProgress(requestId, 50, "Request reopened by admin/manager");
        toast.success("Request reopened successfully");
      } else {
        // Mark as complete - set progress to 100%
        await updateJobProgress(requestId, 100, "Request marked as complete by admin/manager");
        toast.success("Request marked as complete");
      }
      
      // Only trigger the callback after successful completion with a longer delay
      if (onStatusChange) {
        // Use setTimeout with a longer delay to prevent rapid refresh cycles
        setTimeout(() => {
          onStatusChange();
          setIsProcessing(false);
        }, 300);
      } else {
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Error updating request status:", error);
      toast.error("Failed to update request status");
      setIsProcessing(false);
    }
  };

  const handleCancelRequest = async () => {
    // Prevent multiple rapid clicks
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      // Cancel request logic - update progress to 0 and add a cancellation note
      await updateJobProgress(requestId, 0, "Request cancelled by admin/manager");
      toast.success("Request cancelled successfully");
      
      // Trigger refresh callback if provided with a longer delay
      if (onStatusChange) {
        setTimeout(() => {
          onStatusChange();
          setIsProcessing(false);
        }, 300);
      } else {
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast.error("Failed to cancel request");
      setIsProcessing(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="font-semibold mb-4">Actions</h2>
      
      <div className="space-y-3">
        <Button 
          className="w-full justify-start bg-blue-500 hover:bg-blue-600"
          onClick={handleCompleteRequest}
          disabled={isProcessing}
        >
          {status === 'completed' ? (
            <>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Reopen Request
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Complete
            </>
          )}
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start text-red-600 hover:bg-red-50"
          onClick={handleCancelRequest}
          disabled={isProcessing}
        >
          <XCircle className="h-4 w-4 mr-2" />
          Cancel Request
        </Button>
      </div>
    </Card>
  );
};
