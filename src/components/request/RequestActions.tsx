
import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from 'lucide-react';
import { useContractorContext } from '@/contexts/contractor/ContractorContext';
import { toast } from '@/lib/toast';

interface RequestActionsProps {
  status: string;
  requestId: string;
  onStatusChange?: () => void;
}

export const RequestActions = ({ status, requestId, onStatusChange }: RequestActionsProps) => {
  const { updateJobProgress } = useContractorContext();

  const handleCompleteRequest = async () => {
    try {
      if (status === 'completed') {
        // Reopening logic would go here
        // For now we'll just show a toast since reopening is not implemented
        toast.info("Reopening functionality not implemented yet");
      } else {
        // Mark as complete - set progress to 100%
        await updateJobProgress(requestId, 100, "Request marked as complete by admin/manager");
        toast.success("Request marked as complete");
        if (onStatusChange) {
          onStatusChange();
        }
      }
    } catch (error) {
      console.error("Error updating request status:", error);
      toast.error("Failed to update request status");
    }
  };

  const handleCancelRequest = () => {
    // Cancellation logic would go here
    // For now just show a toast since cancellation is not fully implemented
    toast.info("Request cancellation not implemented yet");
  };

  return (
    <Card className="p-6">
      <h2 className="font-semibold mb-4">Actions</h2>
      
      <div className="space-y-3">
        <Button 
          className="w-full justify-start bg-blue-500 hover:bg-blue-600"
          onClick={handleCompleteRequest}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {status === 'completed' ? 'Reopen Request' : 'Mark as Complete'}
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start text-red-600 hover:bg-red-50"
          onClick={handleCancelRequest}
        >
          <XCircle className="h-4 w-4 mr-2" />
          Cancel Request
        </Button>
      </div>
    </Card>
  );
};
