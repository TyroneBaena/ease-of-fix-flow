import React from 'react';
import { ContractorManagementProvider, useContractorManagement } from './ContractorManagementProvider';
import ContractorManagementHeader from './ContractorManagementHeader';
import ContractorTable from './ContractorTable';
import ContractorFormDialog from './ContractorFormDialog';
import DeleteContractorDialog from './DeleteContractorDialog';
import { useContractorDialog } from './hooks/useContractorDialog';
import { useContractorActions } from './hooks/useContractorActions';
import { useContractorPagination } from './hooks/useContractorPagination';
import AccessDeniedMessage from '../user-management/AccessDeniedMessage';
import { Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const ContractorManagementContent: React.FC = () => {
  const { 
    contractors, 
    loading, 
    fetchError, 
    loadContractors, 
    isAdmin, 
    currentUser 
  } = useContractorManagement();

  const {
    isDialogOpen,
    setIsDialogOpen,
    isEditMode,
    selectedContractor,
    newContractor,
    handleOpenDialog,
    handleContractorChange,
    handleSpecialtiesChange
  } = useContractorDialog();

  const {
    currentPage,
    totalPages,
    CONTRACTORS_PER_PAGE,
    handlePageChange
  } = useContractorPagination(contractors.length);

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

  console.log('🔧 ContractorManagement - Render state:', {
    isAdmin,
    currentUserRole: currentUser?.role,
    hasCurrentUser: !!currentUser,
    contractorsCount: contractors.length,
    loading,
    fetchError: !!fetchError
  });

  // Check access permissions
  if (!currentUser) {
    return <AccessDeniedMessage message="You must be logged in to access contractor management." />;
  }

  if (!isAdmin) {
    if (currentUser.role === 'manager') {
      return (
        <Alert>
          <AlertDescription>
            Contractor management is restricted to administrators only. Please contact your administrator for access.
          </AlertDescription>
        </Alert>
      );
    }
    return <AccessDeniedMessage message="You don't have permission to access contractor management." />;
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading contractors...</span>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Alert className="max-w-md">
          <AlertDescription>
            Failed to load contractors: {fetchError.message}
          </AlertDescription>
        </Alert>
        <Button
          onClick={loadContractors}
          className="mt-4"
          variant="outline"
          size="sm"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const handleSave = async () => {
    const success = await handleSaveContractor(isEditMode, selectedContractor, newContractor);
    if (success) {
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <ContractorManagementHeader
        onInviteContractor={() => handleOpenDialog(false)}
      />

      <ContractorTable
        contractors={contractors}
        currentPage={currentPage}
        contractorsPerPage={CONTRACTORS_PER_PAGE}
        totalPages={totalPages}
        loading={actionLoading}
        onPageChange={handlePageChange}
        onEditContractor={(contractor) => handleOpenDialog(true, contractor)}
        onDeleteContractor={confirmDeleteContractor}
        onResetPassword={handleResetPassword}
      />

      <ContractorFormDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
        isEditMode={isEditMode}
        contractor={isEditMode ? selectedContractor : newContractor}
        onContractorChange={handleContractorChange}
        onSpecialtiesChange={handleSpecialtiesChange}
        loading={actionLoading}
      />

      <DeleteContractorDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteContractor}
        contractor={selectedContractorForDeletion}
        loading={actionLoading}
      />
    </div>
  );
};

export const ContractorManagement: React.FC = () => {
  return (
    <ContractorManagementProvider>
      <ContractorManagementContent />
    </ContractorManagementProvider>
  );
};