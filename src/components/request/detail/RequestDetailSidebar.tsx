

import React, { useState } from 'react';
import { RequestQuoteDialog } from '@/components/contractor/RequestQuoteDialog';
import { QuoteRequestDialog } from '@/components/contractor/QuoteRequestDialog';
import { RequestActions } from '@/components/request/RequestActions';
import { QuotesList } from '@/components/request/QuotesList';
import { ContractorAssignment } from '@/components/request/ContractorAssignment';
import { EditRequestDialog } from '@/components/request/EditRequestDialog';
import { JobProgressCard } from '@/components/contractor/JobProgressCard';
import { MaintenanceRequest } from '@/types/maintenance';
import { useUserContext } from '@/contexts/UserContext';
import { LandlordAssignmentCard } from '@/components/request/LandlordAssignmentCard';
import { LandlordReportDialog } from '@/components/request/LandlordReportDialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

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

  const isLandlordAssigned = (request as any).assigned_to_landlord ?? (request as any).assignedToLandlord ?? false;
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeProperty, setIncludeProperty] = useState(true);
  const [includePracticeLeader, setIncludePracticeLeader] = useState(false);
  const [includeIssue, setIncludeIssue] = useState(true);
  const [includePhotos, setIncludePhotos] = useState(true);

  return (
    <div className="space-y-6">
      {/* Job Progress Card - Show for all users if there's progress or assigned contractor */}
      {(request.completionPercentage > 0 || request.contractorId || request.assignedTo) && (
        <JobProgressCard 
          request={request} 
          isContractor={isContractor}
          onProgressUpdate={onRefreshData}
        />
      )}
      
      {/* Request Actions - Available to both admins and managers */}
      <RequestActions 
        status={request.status} 
        requestId={request.id}
        onStatusChange={onRefreshData}
        onEditRequest={canEditRequests ? handleEditRequest : undefined}
      />
      
      {/* Landlord Assignment - Admins and Managers can assign */}
      {canEditRequests && (
        <LandlordAssignmentCard
          requestId={request.id}
          assignedToLandlord={isLandlordAssigned}
          landlordNotes={(request as any).landlord_notes}
          onAssigned={onRefreshData}
        />
      )}

      {/* Always show Landlord Report export with options */}
      <Card className="p-6 space-y-3">
        <div>
          <h3 className="font-semibold mb-1">Landlord Report</h3>
          <p className="text-sm text-muted-foreground">Choose what to include, then export a tailored report.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label className="flex items-center gap-2">
            <Checkbox checked={includeSummary} onCheckedChange={(v) => setIncludeSummary(!!v)} />
            <span>Request Summary</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={includeProperty} onCheckedChange={(v) => setIncludeProperty(!!v)} />
            <span>Property Details</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={includePracticeLeader} onCheckedChange={(v) => setIncludePracticeLeader(!!v)} />
            <span>Practice Leader Details</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={includeIssue} onCheckedChange={(v) => setIncludeIssue(!!v)} />
            <span>Issue Details</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={includePhotos} onCheckedChange={(v) => setIncludePhotos(!!v)} />
            <span>Photos</span>
          </label>
        </div>
        <Button className="w-full" onClick={() => setReportDialogOpen(true)}>Export Landlord Report</Button>
      </Card>

      {/* Contractor Assignment and Quotes - Only when not assigned to landlord */}
      {!isLandlordAssigned && (
        <>
          {canAccessContractorFeatures && (
            <ContractorAssignment 
              requestId={request.id}
              isAssigned={!!request.contractorId}
              currentContractorId={request.contractorId}
              onOpenQuoteDialog={onOpenRequestQuoteDialog}
              onContractorAssigned={onRefreshData}
            />
          )}

          {canAccessContractorFeatures && (
            <QuotesList 
              quotes={quotes}
              requestId={request.id}
              onDataChange={onRefreshData}
            />
          )}
        </>
      )}
      
      {/* Contractor Quote Submission - Only for contractors */}
      {!isAdmin && isContractor && (
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

      {/* Landlord Report Dialog */}
      <LandlordReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        request={request}
        options={{ summary: includeSummary, property: includeProperty, issue: includeIssue, photos: includePhotos, practiceLeader: includePracticeLeader }}
      />
    </div>
  );
};

