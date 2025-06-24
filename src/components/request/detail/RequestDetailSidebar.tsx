
import React, { useState } from 'react';
import { RequestQuoteDialog } from '@/components/contractor/RequestQuoteDialog';
import { QuoteRequestDialog } from '@/components/contractor/QuoteRequestDialog';
import { RequestActions } from '@/components/request/RequestActions';
import { QuotesList } from '@/components/request/QuotesList';
import { ContractorAssignment } from '@/components/request/ContractorAssignment';
import { EditRequestDialog } from '@/components/request/EditRequestDialog';
import { MaintenanceRequest } from '@/types/maintenance';
import { useUserContext } from '@/contexts/UserContext';

interface RequestDetailSidebarProps {
  request: MaintenanceRequest;
  quotes: any[];
  isContractor: boolean;
  onOpenQuoteDialog: () => void;
  onOpenRequestQuoteDialog: () => void;
  onRefreshData: () => void;
}

export const RequestDetailSidebar = ({ 
  request, 
  quotes, 
  isContractor, 
  onOpenQuoteDialog, 
  onOpenRequestQuoteDialog, 
  onRefreshData 
}: RequestDetailSidebarProps) => {
  const { currentUser, isAdmin } = useUserContext();
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Check if user can access contractor features (admins only, not managers)
  const canAccessContractorFeatures = isAdmin;
  
  // Check if user can edit requests (admins and managers)
  const canEditRequests = isAdmin || currentUser?.role === 'manager';

  const handleEditRequest = () => {
    setEditDialogOpen(true);
  };

  const handleRequestUpdated = () => {
    onRefreshData();
  };

  return (
    <div className="space-y-6">
      {/* Request Actions - Available to both admins and managers */}
      <RequestActions 
        status={request.status} 
        requestId={request.id}
        onStatusChange={onRefreshData}
        onEditRequest={canEditRequests ? handleEditRequest : undefined}
      />
      
      {/* Contractor Assignment - Only for admins */}
      {canAccessContractorFeatures && (
        <ContractorAssignment 
          requestId={request.id}
          isAssigned={!!request.contractorId}
          currentContractorId={request.contractorId}
          onOpenQuoteDialog={onOpenRequestQuoteDialog}
          onContractorAssigned={onRefreshData}
        />
      )}
      
      {/* Quotes List - Only for admins */}
      {canAccessContractorFeatures && (
        <QuotesList 
          quotes={quotes}
          requestId={request.id}
          onDataChange={onRefreshData}
        />
      )}
      
      {/* Contractor Quote Submission - Only for contractors */}
      {isContractor && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Submit Quote</h3>
          <p className="text-sm text-blue-700 mb-3">
            Provide your quote for this maintenance request.
          </p>
          <button 
            onClick={onOpenQuoteDialog}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Submit Quote
          </button>
        </div>
      )}
      
      {/* Edit Request Dialog */}
      {canEditRequests && (
        <EditRequestDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          request={request}
          onRequestUpdated={handleRequestUpdated}
        />
      )}
    </div>
  );
};
