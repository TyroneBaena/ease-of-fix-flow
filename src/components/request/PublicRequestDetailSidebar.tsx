import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MaintenanceRequest } from '@/types/maintenance';

interface PublicRequestDetailSidebarProps {
  request: MaintenanceRequest;
}

/**
 * Public sidebar that shows limited functionality
 * Focuses on information display rather than management actions
 */
export const PublicRequestDetailSidebar = ({ request }: PublicRequestDetailSidebarProps) => {
  const [includeSummary, setIncludeSummary] = React.useState(true);
  const [includeProperty, setIncludeProperty] = React.useState(true);
  const [includePracticeLeader, setIncludePracticeLeader] = React.useState(false);
  const [includeIssue, setIncludeIssue] = React.useState(true);
  const [includePhotos, setIncludePhotos] = React.useState(true);

  const handleExportReport = () => {
    alert('Report export feature is available through the property management portal. Please contact your property manager for assistance.');
  };

  return (
    <div className="space-y-6">
      {/* Request Status Card */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Request Status</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Status:</span>
            <span className="text-sm font-medium capitalize">{request.status.replace('_', ' ')}</span>
          </div>
          {request.priority && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Priority:</span>
              <span className="text-sm font-medium capitalize">{request.priority}</span>
            </div>
          )}
          {request.completionPercentage > 0 && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Progress:</span>
              <span className="text-sm font-medium">{request.completionPercentage}%</span>
            </div>
          )}
          {request.assignedTo && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Assigned to:</span>
              <span className="text-sm font-medium">{request.assignedTo}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Progress indicator if in progress */}
      {request.completionPercentage > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Work Progress</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Completion</span>
              <span>{request.completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${request.completionPercentage}%` }}
              ></div>
            </div>
          </div>
        </Card>
      )}

      {/* Landlord Assignment Status */}
      {request.assigned_to_landlord && (
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Landlord Assignment</h3>
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
        </Card>
      )}

      {/* Landlord Report Export */}
      <Card className="p-6 space-y-3">
        <div>
          <h3 className="font-semibold mb-1">Request Report</h3>
          <p className="text-sm text-gray-600">Export a detailed report of this maintenance request.</p>
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
        <Button className="w-full" onClick={handleExportReport}>
          Request Report
        </Button>
      </Card>

      {/* Contact Information */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Need Help?</h3>
        <div className="space-y-3 text-sm">
          <p className="text-gray-600">
            For questions about this maintenance request, please contact your property manager.
          </p>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => window.history.back()}
          >
            Back to Property Portal
          </Button>
        </div>
      </Card>
    </div>
  );
};