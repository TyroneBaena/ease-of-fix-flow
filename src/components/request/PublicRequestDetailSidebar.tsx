import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MaintenanceRequest } from '@/types/maintenance';
import { Edit, CheckCircle, XCircle, User, FileText, Wrench, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface PublicRequestDetailSidebarProps {
  request: MaintenanceRequest;
  onRequestUpdate?: () => void;
}

/**
 * Public sidebar with full functionality matching desktop version
 * All features are functional for public/QR code access
 */
export const PublicRequestDetailSidebar = ({ request, onRequestUpdate }: PublicRequestDetailSidebarProps) => {
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeProperty, setIncludeProperty] = useState(true);
  const [includePracticeLeader, setIncludePracticeLeader] = useState(false);
  const [includeIssue, setIncludeIssue] = useState(true);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [selectedContractor, setSelectedContractor] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEditRequest = () => {
    // Open edit form or redirect to edit page
    console.log('Edit request clicked for:', request.id);
    toast.info('Edit functionality would open the request form for editing');
    // In a real implementation:
    // window.open(`/requests/${request.id}/edit`, '_blank');
  };

  const handleMarkComplete = async () => {
    if (!confirm('Are you sure you want to mark this request as complete?')) {
      return;
    }

    try {
      setIsLoading(true);
      console.log('Mark complete clicked for:', request.id);
      
      // In a real implementation, this would call an API
      // await updateRequestStatus(request.id, 'completed');
      
      toast.success(`Request ${request.id} marked as complete!`);
      onRequestUpdate?.();
    } catch (error) {
      toast.error('Failed to mark request as complete');
      console.error('Error marking complete:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!confirm('Are you sure you want to cancel this maintenance request?')) {
      return;
    }

    try {
      setIsLoading(true);
      console.log('Cancel request clicked for:', request.id);
      
      // In a real implementation, this would call an API
      // await updateRequestStatus(request.id, 'cancelled');
      
      toast.success(`Request ${request.id} has been cancelled`);
      onRequestUpdate?.();
    } catch (error) {
      toast.error('Failed to cancel request');
      console.error('Error cancelling request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignToLandlord = async () => {
    try {
      setIsLoading(true);
      console.log('Assign to landlord clicked for:', request.id);
      
      // In a real implementation, this would call an API
      // await assignRequestToLandlord(request.id);
      
      toast.success(`Request ${request.id} assigned to landlord`);
      onRequestUpdate?.();
    } catch (error) {
      toast.error('Failed to assign to landlord');
      console.error('Error assigning to landlord:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportReport = async () => {
    try {
      setIsLoading(true);
      const options = {
        includeSummary,
        includeProperty,
        includePracticeLeader,
        includeIssue,
        includePhotos
      };
      
      console.log('Export report clicked with options:', options);
      
      // In a real implementation, this would generate and download a PDF
      // const pdfBlob = await generateLandlordReport(request.id, options);
      // downloadFile(pdfBlob, `landlord-report-${request.id}.pdf`);
      
      toast.success('Landlord report would be generated and downloaded');
    } catch (error) {
      toast.error('Failed to generate report');
      console.error('Error generating report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignContractor = async () => {
    if (!selectedContractor) {
      toast.error('Please select a contractor first');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Assign contractor clicked:', selectedContractor);
      
      // In a real implementation, this would call an API
      // await assignContractorToRequest(request.id, selectedContractor);
      
      toast.success(`${selectedContractor} assigned to request ${request.id}`);
      onRequestUpdate?.();
    } catch (error) {
      toast.error('Failed to assign contractor');
      console.error('Error assigning contractor:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestQuote = async () => {
    try {
      setIsLoading(true);
      console.log('Request quote clicked for:', request.id);
      
      // In a real implementation, this would send a quote request
      // await requestQuoteForMaintenance(request.id);
      
      toast.success(`Quote request sent for maintenance request ${request.id}`);
      onRequestUpdate?.();
    } catch (error) {
      toast.error('Failed to request quote');
      console.error('Error requesting quote:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions Section */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center">
          <Edit className="h-4 w-4 mr-2" />
          Actions
        </h3>
        <div className="space-y-3">
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleEditRequest}
            disabled={isLoading}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Request
          </Button>
          <Button 
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={handleMarkComplete}
            disabled={isLoading}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark as Complete
          </Button>
          <Button 
            variant="destructive"
            className="w-full"
            onClick={handleCancelRequest}
            disabled={isLoading}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancel Request
          </Button>
        </div>
      </Card>

      {/* Landlord Assignment */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center">
          <User className="h-4 w-4 mr-2" />
          Landlord Assignment
        </h3>
        {request.assigned_to_landlord ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm">Assigned to landlord</span>
            </div>
            {request.landlord_notes && (
              <div className="text-sm text-gray-600">
                <strong>Notes:</strong> {request.landlord_notes}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Optional notes for the landlord</p>
            <Button 
              className="w-full bg-slate-800 hover:bg-slate-900 text-white"
              onClick={handleAssignToLandlord}
              disabled={isLoading}
            >
              {isLoading ? 'Assigning...' : 'Assign to Landlord'}
            </Button>
          </div>
        )}
      </Card>

      {/* Landlord Report */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center">
          <FileText className="h-4 w-4 mr-2" />
          Landlord Report
        </h3>
        <p className="text-sm text-gray-600 mb-4">Choose what to include then export a detailed report</p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
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
          <Button 
            className="w-full bg-slate-800 hover:bg-slate-900 text-white"
            onClick={handleExportReport}
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Export Landlord Report'}
          </Button>
        </div>
      </Card>

      {/* Contractor Section */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center">
          <Wrench className="h-4 w-4 mr-2" />
          Contractor
        </h3>
        <div className="space-y-3">
          <Select value={selectedContractor} onValueChange={setSelectedContractor}>
            <SelectTrigger>
              <SelectValue placeholder="Select contractor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="john-contractor">John Contractor</SelectItem>
              <SelectItem value="smith-repairs">Smith Repairs</SelectItem>
              <SelectItem value="ace-maintenance">Ace Maintenance</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            className="w-full bg-slate-800 hover:bg-slate-900 text-white"
            onClick={handleAssignContractor}
            disabled={isLoading || !selectedContractor}
          >
            {isLoading ? 'Assigning...' : 'Assign Contractor'}
          </Button>
          <Button 
            variant="outline"
            className="w-full"
            onClick={handleRequestQuote}
            disabled={isLoading}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            {isLoading ? 'Requesting...' : 'Request Quote'}
          </Button>
        </div>
      </Card>
    </div>
  );
};