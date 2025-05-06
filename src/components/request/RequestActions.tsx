
import React, { useState, useCallback } from 'react';
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
  const [actionType, setActionType] = useState<'none' | 'complete' | 'reopen' | 'cancel'>('none');

  // Created a proper async function that can be awaited
  const performStatusUpdate = useCallback(async (
    progress: number, 
    message: string, 
    successMessage: string,
    action: 'complete' | 'reopen' | 'cancel'
  ) => {
    if (isProcessing) return;
    
    try {
      // Set the action type to prevent duplicate actions
      setActionType(action);
      setIsProcessing(true);
      
      // Perform the update
      await updateJobProgress(requestId, progress, message);
      toast.success(successMessage);
      
      // Wait a moment before triggering refresh
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Call the status change callback if provided
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error) {
      console.error(`Error ${action} request:`, error);
      toast.error(`Failed to ${action} request`);
    } finally {
      // Reset after a delay to prevent rapid re-clicks
      setTimeout(() => {
        setIsProcessing(false);
        setActionType('none');
      }, 2000);
    }
  }, [requestId, updateJobProgress, onStatusChange, isProcessing]);

  const handleCompleteRequest = useCallback(async () => {
    if (status === 'completed') {
      await performStatusUpdate(
        50, 
        "Request reopened by admin/manager",
        "Request reopened successfully",
        'reopen'
      );
    } else {
      await performStatusUpdate(
        100, 
        "Request marked as complete by admin/manager",
        "Request marked as complete",
        'complete'
      );
    }
  }, [status, performStatusUpdate]);

  const handleCancelRequest = useCallback(async () => {
    await performStatusUpdate(
      0, 
      "Request cancelled by admin/manager",
      "Request cancelled successfully",
      'cancel'
    );
  }, [performStatusUpdate]);

  // Determine if a specific button should be disabled
  const isButtonDisabled = (action: 'reopen' | 'complete' | 'cancel') => {
    return isProcessing || (actionType !== 'none' && actionType !== action);
  };

  return (
    <Card className="p-6">
      <h2 className="font-semibold mb-4">Actions</h2>
      
      <div className="space-y-3">
        <Button 
          className="w-full justify-start bg-green-500 hover:bg-green-600"
          onClick={handleCompleteRequest}
          disabled={isButtonDisabled(status === 'completed' ? 'reopen' : 'complete')}
        >
          {status === 'completed' ? (
            <>
              <RefreshCcw className="h-4 w-4 mr-2" />
              {isProcessing && actionType === 'reopen' ? 'Reopening...' : 'Reopen Request'}
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              {isProcessing && actionType === 'complete' ? 'Completing...' : 'Mark as Complete'}
            </>
          )}
        </Button>
        
        <Button 
          variant="outline" 
          className="w-full justify-start text-red-600 hover:bg-red-50"
          onClick={handleCancelRequest}
          disabled={isButtonDisabled('cancel')}
        >
          <XCircle className="h-4 w-4 mr-2" />
          {isProcessing && actionType === 'cancel' ? 'Cancelling...' : 'Cancel Request'}
        </Button>
      </div>
    </Card>
  );
};
