
import React from 'react';
import { useContractorManagement } from './contractor-management/hooks/useContractorManagement';
import ContractorManagementHeader from './contractor-management/ContractorManagementHeader';
import ContractorTable from './contractor-management/ContractorTable';
import ContractorFormDialog from './contractor-management/ContractorFormDialog';
import AccessDeniedMessage from './user-management/AccessDeniedMessage';
import DeleteContractorDialog from './contractor-management/DeleteContractorDialog';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

const ContractorManagement = () => {
  const {
    contractors,
    currentUser,
    isAdmin,
    isLoading,
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
    handleSaveContractor,
    handleResetPassword,
    confirmDeleteContractor,
    handleDeleteContractor,
    handlePageChange,
    fetchContractors
  } = useContractorManagement();
  
  // If not admin, show access denied message
  if (!isAdmin) {
    return <AccessDeniedMessage />;
  }
  
  // Show loading state
  if (isLoading && contractors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-600">Loading contractor data...</p>
      </div>
    );
  }
  
  // Show error state with retry button
  if (fetchError) {
    return (
      <div className="p-4">
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Failed to load contractors</AlertTitle>
          <AlertDescription>
            There was an error loading the contractor data. Please try again.
          </AlertDescription>
        </Alert>
        <Button 
          onClick={() => fetchContractors()} 
          variant="outline"
          className="mt-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Retrying...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </>
          )}
        </Button>
      </div>
    );
  }
  
  return (
    <div>
      <ContractorManagementHeader onInviteContractor={() => handleOpenDialog()} />
      
      <ContractorTable 
        contractors={contractors}
        isLoading={isLoading}
        onEditContractor={(contractor) => handleOpenDialog(true, contractor)}
        onDeleteContractor={confirmDeleteContractor}
        onResetPassword={handleResetPassword}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        contractorsPerPage={CONTRACTORS_PER_PAGE}
      />
      
      <ContractorFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        isEditMode={isEditMode}
        contractor={newContractor}
        selectedContractorId={selectedContractor?.id}
        isLoading={isLoading}
        onContractorChange={handleContractorChange}
        onSpecialtiesChange={handleSpecialtiesChange}
        onSave={handleSaveContractor}
      />
      
      <DeleteContractorDialog
        isOpen={isDeleteConfirmOpen}
        onOpenChange={setIsDeleteConfirmOpen}
        isLoading={isLoading}
        onConfirmDelete={handleDeleteContractor}
        selectedContractor={selectedContractor}
      />
    </div>
  );
};

export default ContractorManagement;
