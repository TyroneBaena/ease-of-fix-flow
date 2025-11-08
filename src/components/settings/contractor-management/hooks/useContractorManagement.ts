
import { useState, useCallback, useEffect, useRef } from 'react';
import { Contractor } from '@/types/contractor';
import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';
import { useContractorDialog } from './useContractorDialog';
import { useContractorActions } from './useContractorActions';
import { useContractorPagination } from './useContractorPagination';
import { fetchContractors } from '../operations/contractorFetch';
import { toast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';

export const useContractorManagement = () => {
  const { currentUser, isAdmin, session } = useSimpleAuth();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<Error | null>(null);
  const [ready, setReady] = useState(false);

  console.log('🔧 useContractorManagement - Hook state:', {
    isAdmin,
    currentUserRole: currentUser?.role,
    hasCurrentUser: !!currentUser,
    loading
  });

  // v77.0: CRITICAL FIX - Subscribe to coordinator's instant reset
  const hasCompletedInitialLoadRef = useRef(false);
  useEffect(() => {
    const unsubscribe = visibilityCoordinator.onTabRefreshChange((isRefreshing: boolean) => {
      if (!isRefreshing && hasCompletedInitialLoadRef.current) {
        // Instant reset: Clear loading immediately on tab return
        console.log('⚡ v77.0 - ContractorManagement - Instant loading reset from coordinator');
        setLoading(false);
      }
    });
    
    return unsubscribe;
  }, []);

  const {
    isDialogOpen,
    setIsDialogOpen,
    isEditMode,
    selectedContractor,
    newContractor,
    handleOpenDialog,
    handleContractorChange,
    handleSpecialtiesChange,
    isPreparingDialog
  } = useContractorDialog(session);

  const {
    currentPage,
    totalPages,
    CONTRACTORS_PER_PAGE,
    handlePageChange
  } = useContractorPagination(contractors.length);

  // v57.0: Updated timeout to 30s (was 5s)
  const loadContractors = useCallback(async () => {
    console.log("🔄 v57.0 - loadContractors - Starting");
    
    try {
      setLoading(true);
      console.log("Fetching contractors in useContractorManagement...");
      console.log("User is admin:", isAdmin);
      
      // v57.0: Increased timeout to 30s (was 5s) to match coordinator
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error("⏱️ v57.0 - loadContractors - Timeout after 30s");
      }, 30000);
      
      try {
        console.log("Attempting to fetch contractors directly from Supabase...");
        
        const { data: rawData, error, count } = await supabase
          .from('contractors')
          .select('*', { count: 'exact' });
        
        clearTimeout(timeoutId);
        
        if (error) {
          console.error("Supabase query error:", error);
          throw error;
        }
        
        console.log("Raw contractors count from direct query:", count);
        console.log("Raw data from contractors table:", rawData);
        
        const data = await fetchContractors();
        console.log("Contractors after mapping:", data);
        
        setContractors(data);
        setFetchError(null);
        console.log("✅ loadContractors - Success, loaded", data.length, "contractors");
        
        if (data.length === 0) {
          console.log("No contractors were returned after fetching");
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        throw fetchErr;
      }
    } catch (err) {
      console.error("❌ loadContractors - Error:", err);
      setFetchError(err instanceof Error ? err : new Error('Failed to fetch contractors'));
      
      if (err instanceof Error && (err.message.includes('aborted') || err.message.includes('timeout'))) {
        toast.error('Loading contractors timed out. Please refresh the page.');
      }
    } finally {
      // CRITICAL: Always reset loading state
      console.log("🏁 loadContractors - Finally block, resetting loading");
      setLoading(false);
      hasCompletedInitialLoadRef.current = true; // v77.0: Mark as completed
    }
  }, []); // CRITICAL: Empty dependencies to prevent recreation

  // Initialize the contractor actions after loadContractors is defined
  const {
    loading: actionLoading,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    handleSaveContractor,
    handleResetPassword,
    confirmDeleteContractor,
    handleDeleteContractor,
    selectedContractorForDeletion
  } = useContractorActions(loadContractors);

  // Initial load on mount - only once
  useEffect(() => {
    console.log('🎬 useContractorManagement - Mount effect, isAdmin:', isAdmin);
    if (isAdmin) {
      loadContractors();
    }
  }, [isAdmin]); // FIXED: Removed loadContractors from deps since it has empty deps

  // Set ready once we have basic data - don't block on session checks
  useEffect(() => {
    if (isAdmin && (contractors.length > 0 || !loading)) {
      console.log('✅ useContractorManagement - System ready for operations');
      setReady(true);
    }
  }, [isAdmin, contractors.length, loading]);

  const handleSave = async () => {
    const success = await handleSaveContractor(isEditMode, selectedContractor, newContractor);
    if (success) {
      setIsDialogOpen(false);
    }
  };

  return {
    contractors,
    currentUser,
    isAdmin,
    isLoading: loading || actionLoading,
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
    ready,
    isPreparingDialog
  };
};
