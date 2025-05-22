
import { useCallback } from 'react';
import { updateJobProgressStatus } from '../operations';

/**
 * Hook for job progress operations
 */
export const useProgressOperations = () => {
  // Update job progress function
  const handleUpdateJobProgress = useCallback(async (
    requestId: string,
    progress: number,
    notes?: string,
    completionPhotos?: Array<{ url: string }>
  ) => {
    console.log(`useProgressOperations - Updating job progress for request ${requestId} to ${progress}%`);
    try {
      await updateJobProgressStatus(requestId, progress, notes);
      console.log("useProgressOperations - Job progress updated successfully");
      return true;
    } catch (err) {
      console.error("useProgressOperations - Error updating job progress:", err);
      throw err;
    }
  }, []);

  return {
    updateJobProgress: handleUpdateJobProgress
  };
};
