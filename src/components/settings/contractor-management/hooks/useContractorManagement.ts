// import { useState, useCallback, useEffect, useRef } from 'react';
// import { Contractor } from '@/types/contractor';
// import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';
// import { useContractorDialog } from './useContractorDialog';
// import { useContractorActions } from './useContractorActions';
// import { useContractorPagination } from './useContractorPagination';
// import { fetchContractors } from '../operations/contractorFetch';
// import { toast } from '@/lib/toast';
// import { supabase } from '@/lib/supabase';

// export const useContractorManagement = () => {
//   const { currentUser, isAdmin, session } = useSimpleAuth();
//   const [contractors, setContractors] = useState<Contractor[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [fetchError, setFetchError] = useState<Error | null>(null);
//   const [ready, setReady] = useState(false);

//   console.log('🔧 useContractorManagement - Hook state:', {
//     isAdmin,
//     currentUserRole: currentUser?.role,
//     hasCurrentUser: !!currentUser,
//     loading
//   });

//   // v78.0: Removed onTabRefreshChange subscription - no longer needed
//   const hasCompletedInitialLoadRef = useRef(false);

//   const {
//     isDialogOpen,
//     setIsDialogOpen,
//     isEditMode,
//     selectedContractor,
//     newContractor,
//     handleOpenDialog,
//     handleContractorChange,
//     handleSpecialtiesChange,
//     isPreparingDialog
//   } = useContractorDialog(session);

//   const {
//     currentPage,
//     totalPages,
//     CONTRACTORS_PER_PAGE,
//     handlePageChange
//   } = useContractorPagination(contractors.length);

//   // v57.0: Updated timeout to 30s (was 5s)
//   const loadContractors = useCallback(async () => {
//     console.log("🔄 v57.0 - loadContractors - Starting");

//     try {
//       setLoading(true);
//       console.log("Fetching contractors in useContractorManagement...");
//       console.log("User is admin:", isAdmin);

//       try {
//         console.log("Attempting to fetch contractors directly from Supabase...");

//         const { data: rawData, error, count } = await supabase
//           .from('contractors')
//           .select('*', { count: 'exact' });

//         if (error) {
//           console.error("Supabase query error:", error);
//           throw error;
//         }

//         console.log("Raw contractors count from direct query:", count);
//         console.log("Raw data from contractors table:", rawData);

//         const data = await fetchContractors();
//         console.log("Contractors after mapping:", data);

//         setContractors(data);
//         setFetchError(null);
//         console.log("✅ loadContractors - Success, loaded", data.length, "contractors");

//         if (data.length === 0) {
//           console.log("No contractors were returned after fetching");
//         }
//       } catch (fetchErr) {
//         throw fetchErr;
//       }
//     } catch (err) {
//       console.error("❌ loadContractors - Error:", err);
//       setFetchError(err instanceof Error ? err : new Error('Failed to fetch contractors'));

//       if (err instanceof Error && (err.message.includes('aborted') || err.message.includes('timeout'))) {
//         toast.error('Loading contractors timed out. Please refresh the page.');
//       }
//       } finally {
//         setLoading(false);
//         hasCompletedInitialLoadRef.current = true;
//       }
//   }, []); // CRITICAL: Empty dependencies to prevent recreation

//   // Initialize the contractor actions after loadContractors is defined
//   const {
//     loading: actionLoading,
//     isDeleteConfirmOpen,
//     setIsDeleteConfirmOpen,
//     handleSaveContractor,
//     handleResetPassword,
//     confirmDeleteContractor,
//     handleDeleteContractor,
//     selectedContractorForDeletion
//   } = useContractorActions(loadContractors);

//   // Initial load on mount - only once
//   useEffect(() => {
//     console.log('🎬 useContractorManagement - Mount effect, isAdmin:', isAdmin);
//     if (isAdmin) {
//       loadContractors();
//     }
//   }, [isAdmin]); // FIXED: Removed loadContractors from deps since it has empty deps

//   // Set ready once we have basic data - don't block on session checks
//   useEffect(() => {
//     if (isAdmin && (contractors.length > 0 || !loading)) {
//       console.log('✅ useContractorManagement - System ready for operations');
//       setReady(true);
//     }
//   }, [isAdmin, contractors.length, loading]);

//   const handleSave = async () => {
//     const success = await handleSaveContractor(isEditMode, selectedContractor, newContractor);
//     if (success) {
//       setIsDialogOpen(false);
//     }
//   };

//   return {
//     contractors,
//     currentUser,
//     isAdmin,
//     isLoading: loading || actionLoading,
//     fetchError,
//     isDialogOpen,
//     setIsDialogOpen,
//     isEditMode,
//     newContractor,
//     selectedContractor,
//     currentPage,
//     totalPages,
//     CONTRACTORS_PER_PAGE,
//     isDeleteConfirmOpen,
//     setIsDeleteConfirmOpen,
//     handleOpenDialog,
//     handleContractorChange,
//     handleSpecialtiesChange,
//     handleSaveContractor: handleSave,
//     handleResetPassword,
//     confirmDeleteContractor,
//     handleDeleteContractor,
//     handlePageChange,
//     fetchContractors: loadContractors,
//     selectedContractorForDeletion,
//     ready,
//     isPreparingDialog
//   };
// };

import { useState, useCallback, useEffect, useRef } from "react";
import { Contractor } from "@/types/contractor";
import { useSimpleAuth } from "@/contexts/UnifiedAuthContext";
import { useContractorDialog } from "./useContractorDialog";
import { useContractorActions } from "./useContractorActions";
import { useContractorPagination } from "./useContractorPagination";
import { fetchContractors } from "../operations/contractorFetch";
import { toast } from "@/lib/toast";
import { supabase } from "@/lib/supabase";

export const useContractorManagement = () => {
  const { currentUser, isAdmin, session, isLoading: authLoading } = useSimpleAuth();

  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<Error | null>(null);

  const sessionReady = useRef(false);

  // Prevents double-loading
  const hasLoadedOnce = useRef(false);

  console.log("⚙️ ContractorManagement — Auth state:", {
    hasCurrentUser: !!currentUser,
    isAdmin,
    sessionExists: !!session,
    authLoading,
  });

  /**
   * 🚀 CRITICAL FIX:
   * Wait until Supabase session is actually ready.
   */
  useEffect(() => {
    if (!authLoading && session && currentUser) {
      console.log("🎉 Session ready in ContractorManagement");
      sessionReady.current = true;
    }
  }, [authLoading, session, currentUser]);

  /**
   * 🔥 Final safe loader — will only run after:
   *    1. User is loaded
   *    2. Session is validated
   *    3. Admin is confirmed
   */
  const loadContractors = useCallback(async () => {
    console.log("🔄 loadContractors() started");

    if (!sessionReady.current) {
      console.log("⏳ Session NOT ready — delaying loadContractors");
      return;
    }

    if (!isAdmin) {
      console.log("⛔ loadContractors blocked — user not admin");
      return;
    }

    try {
      setLoading(true);
      console.log("📡 Fetching contractors…");

      const list = await fetchContractors();

      console.log("📥 Contractors received:", list);

      setContractors(list);
      setFetchError(null);
    } catch (err) {
      console.error("❌ loadContractors error:", err);
      setFetchError(err instanceof Error ? err : new Error("Failed to load contractors"));
      toast.error("Could not load contractors");
    } finally {
      setLoading(false);
      hasLoadedOnce.current = true;
    }
  }, [isAdmin]);

  /**
   * 🔥 Only run loader AFTER session is confirmed ready
   */
  useEffect(() => {
    if (sessionReady.current && isAdmin && !hasLoadedOnce.current) {
      console.log("🚀 Triggering initial contractor load");
      loadContractors();
    }
  }, [sessionReady.current, isAdmin]);

  /**
   * Dialog + actions (unchanged)
   */
  const {
    isDialogOpen,
    setIsDialogOpen,
    isEditMode,
    selectedContractor,
    newContractor,
    handleOpenDialog,
    handleContractorChange,
    handleSpecialtiesChange,
    isPreparingDialog,
  } = useContractorDialog(session);

  const { currentPage, totalPages, CONTRACTORS_PER_PAGE, handlePageChange } = useContractorPagination(
    contractors.length,
  );

  const {
    loading: actionLoading,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    handleSaveContractor,
    handleResetPassword,
    confirmDeleteContractor,
    handleDeleteContractor,
    selectedContractorForDeletion,
  } = useContractorActions(loadContractors);

  const handleSave = async () => {
    const ok = await handleSaveContractor(isEditMode, selectedContractor, newContractor);
    if (ok) setIsDialogOpen(false);
  };

  return {
    contractors,
    currentUser,
    isAdmin,
    isLoading: loading || actionLoading || authLoading,
    fetchError,
    isDialogOpen,
    setIsDialogOpen,
    isEditMode,
    newContractor,
    selectedContractor,
    currentPage,
    totalPages,
    CONTRACTORS_PER_PAGE,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    handleOpenDialog,
    handleContractorChange,
    handleSpecialtiesChange,
    handleSaveContractor: handleSave,
    handleResetPassword,
    confirmDeleteContractor,
    handleDeleteContractor,
    handlePageChange,
    fetchContractors: loadContractors,
    selectedContractorForDeletion,
    isPreparingDialog,
  };
};
