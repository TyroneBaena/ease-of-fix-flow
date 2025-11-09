// import { useCallback } from 'react';
// import { assignContractorToRequest } from '../operations';

// /**
//  * Hook for contractor assignment operations
//  */
// export const useAssignmentOperations = () => {
//   // Assign contractor function
//   const handleAssignContractor = useCallback(async (
//     requestId: string,
//     contractorId: string
//   ) => {
//     console.log(`useAssignmentOperations - Assigning contractor ${contractorId} to request ${requestId}`);
//     try {
//       await assignContractorToRequest(requestId, contractorId);
//       console.log("useAssignmentOperations - Contractor assigned successfully");
//       return true;
//     } catch (err) {
//       console.error("useAssignmentOperations - Error assigning contractor:", err);
//       throw err;
//     }
//   }, []);

//   // Change assignment function
//   const handleChangeAssignment = useCallback(async (
//     requestId: string,
//     contractorId: string
//   ) => {
//     console.log(`useAssignmentOperations - Changing assignment for request ${requestId} to contractor ${contractorId}`);
//     try {
//       await assignContractorToRequest(requestId, contractorId);
//       console.log("useAssignmentOperations - Assignment changed successfully");
//       return true;
//     } catch (err) {
//       console.error("useAssignmentOperations - Error changing assignment:", err);
//       throw err;
//     }
//   }, []);

//   return {
//     assignContractor: handleAssignContractor,
//     changeAssignment: handleChangeAssignment
//   };
// };

import { useCallback } from "react";
import { assignContractorToRequest } from "../operations";

/**
 * Hook for contractor assignment operations
 */
export const useAssignmentOperations = () => {
  // Assign contractor function
  const handleAssignContractor = useCallback(async (requestId: string, contractorId: string) => {
    console.log(`useAssignmentOperations - Assigning contractor ${contractorId} to request ${requestId}`);
    try {
      await assignContractorToRequest(requestId, contractorId);
      console.log("useAssignmentOperations - Contractor assigned successfully");
      return true;
    } catch (err) {
      console.error("useAssignmentOperations - Error assigning contractor:", err);
      throw err;
    }
  }, []);

  // Change assignment function
  const handleChangeAssignment = useCallback(async (requestId: string, contractorId: string) => {
    console.log(`useAssignmentOperations - Changing assignment for request ${requestId} to contractor ${contractorId}`);
    try {
      await assignContractorToRequest(requestId, contractorId);
      console.log("useAssignmentOperations - Assignment changed successfully");
      return true;
    } catch (err) {
      console.error("useAssignmentOperations - Error changing assignment:", err);
      throw err;
    }
  }, []);

  return {
    assignContractor: handleAssignContractor,
    changeAssignment: handleChangeAssignment,
  };
};
