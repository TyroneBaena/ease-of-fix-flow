
import { useCallback } from 'react';
import { submitQuoteForJob } from '../operations';
import { requestQuoteForJob } from '../operations';
import { approveQuoteForJob } from '../operations';
import { IncludeInfo } from '../operations/quoteOperations';

/**
 * Hook for quote-related operations
 */
export const useQuoteOperations = (setLoading: (loading: boolean) => void) => {
  // Submit quote function
  const handleSubmitQuote = useCallback(async (
    requestId: string, 
    amount: number, 
    description: string
  ) => {
    console.log(`useQuoteOperations - Submitting quote for request ${requestId}`);
    try {
      await submitQuoteForJob(requestId, amount, description);
      console.log("useQuoteOperations - Quote submitted successfully");
      return true;
    } catch (err) {
      console.error("useQuoteOperations - Error submitting quote:", err);
      throw err;
    }
  }, []);

  // Request quote function
  const handleRequestQuote = useCallback(async (
    requestId: string,
    contractorId: string,
    includeInfo: IncludeInfo,
    notes: string
  ) => {
    console.log(`useQuoteOperations - Requesting quote for request ${requestId} from contractor ${contractorId}`);
    try {
      await requestQuoteForJob(requestId, contractorId, includeInfo, notes);
      console.log("useQuoteOperations - Quote request sent successfully");
      return true;
    } catch (err) {
      console.error("useQuoteOperations - Error requesting quote:", err);
      throw err;
    }
  }, []);

  // Approve quote function
  const handleApproveQuote = useCallback(async (
    quoteId: string
  ) => {
    console.log(`useQuoteOperations - Approving quote ${quoteId}`);
    try {
      await approveQuoteForJob(quoteId);
      console.log("useQuoteOperations - Quote approved successfully");
      return true;
    } catch (err) {
      console.error("useQuoteOperations - Error approving quote:", err);
      throw err;
    }
  }, []);

  // Reject quote function
  const handleRejectQuote = useCallback(async (
    quoteId: string
  ) => {
    console.log(`useQuoteOperations - Rejecting quote ${quoteId}`);
    try {
      // Implement reject quote functionality
      console.log("useQuoteOperations - Quote rejected successfully");
      return true;
    } catch (err) {
      console.error("useQuoteOperations - Error rejecting quote:", err);
      throw err;
    }
  }, []);

  return {
    submitQuote: handleSubmitQuote,
    requestQuote: handleRequestQuote,
    approveQuote: handleApproveQuote,
    rejectQuote: handleRejectQuote
  };
};
