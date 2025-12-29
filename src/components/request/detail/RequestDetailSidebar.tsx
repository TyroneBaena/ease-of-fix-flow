import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RequestActions } from "@/components/request/RequestActions";
import { QuotesList } from "@/components/request/QuotesList";
import { ContractorAssignment } from "@/components/request/ContractorAssignment";
import { EditRequestDialog } from "@/components/request/EditRequestDialog";
import { JobProgressCard } from "@/components/contractor/JobProgressCard";
import { MaintenanceRequest } from "@/types/maintenance";
import { useUserContext } from "@/contexts/UnifiedAuthContext";
import { LandlordCommunicationCard } from "@/components/request/LandlordCommunicationCard";
import { ResponsibilitySuggestionCard } from "@/components/request/ResponsibilitySuggestionCard";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateRequestPriority } from "@/utils/statusTransitions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
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
  onRefreshData,
}: RequestDetailSidebarProps) => {
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useUserContext();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
  const [propertyOwnershipType, setPropertyOwnershipType] = useState<string | null>(null);

  // Fetch property ownership type
  useEffect(() => {
    const fetchPropertyOwnershipType = async () => {
      if (!request.propertyId) return;
      
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('ownership_type')
          .eq('id', request.propertyId)
          .single();
        
        if (!error && data) {
          setPropertyOwnershipType(data.ownership_type);
        }
      } catch (err) {
        console.error('Error fetching property ownership type:', err);
      }
    };

    fetchPropertyOwnershipType();
  }, [request.propertyId]);

  // Check if user can access contractor features (admins only, not managers)
  const canAccessContractorFeatures = isAdmin;

  // Check if user can edit requests (admins and managers)
  const canEditRequests = isAdmin || currentUser?.role === "manager";
  
  // Check if property is rented
  const isRentedProperty = propertyOwnershipType === 'rented';

  const handleEditRequest = () => {
    setEditDialogOpen(true);
  };

  const handleRequestUpdated = async () => {
    // Refresh detail page data
    await onRefreshData();
  };

  const handlePriorityChange = async (newPriority: string) => {
    setIsUpdatingPriority(true);
    try {
      const success = await updateRequestPriority(
        request.id,
        newPriority as 'low' | 'medium' | 'high' | 'critical'
      );
      if (success) {
        toast.success(`Priority updated to ${newPriority}`);
        await onRefreshData();
      } else {
        toast.error('Failed to update priority');
      }
    } catch (error) {
      console.error('Error updating priority:', error);
      toast.error('Failed to update priority');
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  const isLandlordAssigned = (request as any).assigned_to_landlord ?? (request as any).assignedToLandlord ?? false;

  return (
    <div className="space-y-6">
      {/* Job Progress Card - Show for all users if there's progress or assigned contractor */}
      {(request.completionPercentage > 0 || request.contractorId || request.assignedTo) && (
        <JobProgressCard request={request} isContractor={isContractor} onProgressUpdate={onRefreshData} />
      )}

      {/* Request Actions - Available to both admins and managers */}
      <RequestActions
        status={request.status}
        requestId={request.id}
        onStatusChange={onRefreshData}
        onEditRequest={canEditRequests ? handleEditRequest : undefined}
        onCancelSuccess={() => navigate("/dashboard")}
      />

      {/* Priority Selector - Admin only */}
      {isAdmin && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2">Priority</h3>
          <Select 
            value={request.priority || 'medium'} 
            onValueChange={handlePriorityChange}
            disabled={isUpdatingPriority}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </Card>
      )}

      {/* Unified Landlord Communication - Admins and Managers */}
      {canEditRequests && (
        <LandlordCommunicationCard
          request={request}
          onRefreshData={onRefreshData}
        />
      )}

      {/* Contractor Assignment and Quotes - Only when not assigned to landlord */}
      {!isLandlordAssigned && (
        <>
          {canAccessContractorFeatures && (
            <ContractorAssignment
              requestId={request.id}
              requestTitle={request.title}
              isAssigned={!!request.contractorId}
              currentContractorId={request.contractorId}
              onOpenQuoteDialog={onOpenRequestQuoteDialog}
              onContractorAssigned={onRefreshData}
            />
          )}

          {/* AI Responsibility Suggestion - Only for rented properties */}
          {isRentedProperty && canEditRequests && (
            <ResponsibilitySuggestionCard request={request} onSaved={onRefreshData} />
          )}

          {canAccessContractorFeatures && !request.contractorId && (
            <QuotesList quotes={quotes} requestId={request.id} onDataChange={onRefreshData} />
          )}
        </>
      )}

      {/* Contractor Quote Submission - Only for contractors */}
      {!isAdmin && isContractor && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Submit Quote</h3>
          <p className="text-sm text-blue-700 mb-3">Provide your quote for this maintenance request.</p>
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
