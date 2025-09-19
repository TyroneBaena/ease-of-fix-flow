
import { useMemo } from 'react';
import { useContractorsState } from './hooks/useContractorsState';
import { useQuoteOperations } from './hooks/useQuoteOperations';
import { useAssignmentOperations } from './hooks/useAssignmentOperations';
import { useProgressOperations } from './hooks/useProgressOperations';

/**
 * Main hook combining all contractor operations
 */
export const useContractorOperations = () => {
  const contractorsState = useContractorsState();
  const { loading, setLoading, error } = contractorsState;
  
  const quoteOperations = useQuoteOperations(setLoading);
  const assignmentOperations = useAssignmentOperations();
  const progressOperations = useProgressOperations();

  return useMemo(() => ({
    ...contractorsState,
    ...quoteOperations,
    ...assignmentOperations,
    ...progressOperations
  }), [contractorsState, quoteOperations, assignmentOperations, progressOperations]);
};

// Re-export the submitQuoteForJob function so it can be used in the index.ts re-exports
export { submitQuoteForJob } from './operations';
