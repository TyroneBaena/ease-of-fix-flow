
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { MaintenanceRequest } from '@/types/property';
import { formatDate } from '../utils/reportHelpers';

interface ReportHeaderProps {
  filteredRequests: MaintenanceRequest[];
  getPropertyName: (propertyId: string) => string;
  onRefresh?: () => void;
}

const ReportHeader: React.FC<ReportHeaderProps> = ({ 
  filteredRequests, 
  getPropertyName,
  onRefresh
}) => {
  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredRequests.map(request => ({
        'Issue Nature': request.issueNature || request.title || 'N/A',
        'Property': request.propertyId ? getPropertyName(request.propertyId) : 'N/A',
        'Site': request.site || request.category || 'N/A',
        'Location': request.location || 'N/A',
        'Priority': request.priority || 'N/A',
        'Status': request.status || 'N/A',
        'Participant Related': request.isParticipantRelated ? 'Yes' : 'No',
        'Participant Name': request.participantName || 'N/A',
        'Created At': formatDate(request.createdAt),
        'Report Date': request.reportDate || formatDate(request.createdAt),
        'Last Updated': request.updatedAt ? formatDate(request.updatedAt) : 'N/A',
        'Submitted By': request.submittedBy || 'N/A',
        'Attempted Fix': request.attemptedFix || 'N/A'
      }))
    );
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Maintenance Requests');
    
    // Generate file name with date
    const fileName = `maintenance-requests-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    
    // Write and download
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-xl font-semibold">Maintenance Requests Report</h2>
      <div className="flex gap-2">
        {onRefresh && (
          <Button 
            variant="outline" 
            onClick={onRefresh} 
            className="flex items-center"
            title="Refresh data"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
        <Button 
          onClick={downloadExcel} 
          className="flex items-center"
          disabled={filteredRequests.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Download Excel
        </Button>
      </div>
    </div>
  );
};

export default ReportHeader;
