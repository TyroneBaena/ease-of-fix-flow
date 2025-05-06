
import React, { useState, useCallback, useRef } from 'react';
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
  const [lastActionTime, setLastActionTime] = useState(0);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const onStatusChangeCalledRef = useRef(false);

  // Clear any timeouts when component unmounts
  React.useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  // Enhanced debounced action handler with timeout management
  const performStatusUpdate = useCallback(async (
    progress: number, 
    message: string, 
    successMessage: string,
    action: 'complete' | 'reopen' | 'cancel'
  ) => {
    // Strong time-based debouncing - prevent actions within 10 seconds of each other
    const currentTime = Date.now();
    if (currentTime - lastActionTime < 10000) {
      console.log(`RequestActions - Action ${action} too soon after last action, skipping`);
      return;
    }
    
    // Prevent duplicate actions if already processing
    if (isProcessing) {
      console.log(`RequestActions - ${action} action already in progress, skipping`);
      return;
    }
    
    try {
      // Set the action type and processing state to lock the UI
      setActionType(action);
      setIsProcessing(true);
      setLastActionTime(currentTime);
      onStatusChangeCalledRef.current = false;
      
      console.log(`RequestActions - Performing ${action} action`);
      
      // Perform the actual backend update
      await updateJobProgress(requestId, progress, message);
      toast.success(successMessage);
      
      // Only trigger the parent callback once and after a delay
      if (onStatusChange && !onStatusChangeCalledRef.current) {
        console.log(`RequestActions - Action ${action} complete, calling onStatusChange once`);
        onStatusChangeCalledRef.current = true;
        
        // Call onStatusChange only once with a delay to avoid rapid state changes
        setTimeout(() => {
          onStatusChange();
        }, 2000);
      }
      
      // Set a longer timeout before allowing new actions
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      
      processingTimeoutRef.current = setTimeout(() => {
        console.log(`RequestActions - Resetting processing state after ${action}`);
        setIsProcessing(false);
        setActionType('none');
        processingTimeoutRef.current = null;
      }, 10000) as unknown as NodeJS.Timeout;
      
    } catch (error) {
      console.error(`Error ${action} request:`, error);
      toast.error(`Failed to ${action} request`);
      
      // Even on error, wait before resetting to prevent rapid retries
      setTimeout(() => {
        setIsProcessing(false);
        setActionType('none');
      }, 5000);
    }
  }, [requestId, updateJobProgress, onStatusChange, isProcessing, lastActionTime]);

  // Handler for complete/reopen actions
  const handleCompleteRequest = useCallback(() => {
    if (status === 'completed') {
      performStatusUpdate(
        50, 
        "Request reopened by admin/manager",
        "Request reopened successfully",
        'reopen'
      );
    } else {
      performStatusUpdate(
        100, 
        "Request marked as complete by admin/manager",
        "Request marked as complete",
        'complete'
      );
    }
  }, [status, performStatusUpdate]);

  // Handler for cancel action
  const handleCancelRequest = useCallback(() => {
    performStatusUpdate(
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
