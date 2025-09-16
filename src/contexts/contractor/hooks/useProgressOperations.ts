
import { useCallback } from 'react';
import { updateJobProgressStatus } from '../operations/progressOperations';

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
    console.log(`useProgressOperations - Notes:`, notes);
    console.log(`useProgressOperations - Completion photos:`, completionPhotos);
    
    try {
      // Pass ALL parameters including completionPhotos
      await updateJobProgressStatus(requestId, progress, notes, completionPhotos);
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
