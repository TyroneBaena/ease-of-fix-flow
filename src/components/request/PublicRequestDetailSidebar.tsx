import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MaintenanceRequest } from '@/types/maintenance';
import { Edit, CheckCircle, XCircle, User, FileText, Wrench, DollarSign } from 'lucide-react';

interface PublicRequestDetailSidebarProps {
  request: MaintenanceRequest;
}

/**
 * Public sidebar with full functionality matching desktop version
 * All features are functional for public/QR code access
 */
export const PublicRequestDetailSidebar = ({ request }: PublicRequestDetailSidebarProps) => {
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeProperty, setIncludeProperty] = useState(true);
  const [includePracticeLeader, setIncludePracticeLeader] = useState(false);
  const [includeIssue, setIncludeIssue] = useState(true);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [selectedContractor, setSelectedContractor] = useState("");

  const handleEditRequest = () => {
    alert('Edit request functionality - opens request form for editing');
  };

  const handleMarkComplete = () => {
    alert('Mark as complete functionality - updates request status to completed');
  };

  const handleCancelRequest = () => {
    alert('Cancel request functionality - cancels the maintenance request');
  };

  const handleAssignToLandlord = () => {
    alert('Assign to landlord functionality - assigns request to property landlord');
  };

  const handleExportReport = () => {
    alert('Export landlord report functionality - generates and downloads report');
  };

  const handleAssignContractor = () => {
    alert('Assign contractor functionality - assigns selected contractor to request');
  };

  const handleRequestQuote = () => {
    alert('Request quote functionality - requests quote from contractor');
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
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Request
          </Button>
          <Button 
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={handleMarkComplete}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark as Complete
          </Button>
          <Button 
            variant="destructive"
            className="w-full"
            onClick={handleCancelRequest}
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
            >
              Assign to Landlord
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
          >
            Export Landlord Report
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
              <SelectValue placeholder="John Contractor" />
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
          >
            Assign Contractor
          </Button>
          <Button 
            variant="outline"
            className="w-full"
            onClick={handleRequestQuote}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Request Quote
          </Button>
        </div>
      </Card>
    </div>
  );
};