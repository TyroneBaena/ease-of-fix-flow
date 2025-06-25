
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
  // Add filter information for export filename
  currentFilters?: {
    propertyFilter: string;
    statusFilter: string;
    searchTerm: string;
  };
}

const ReportHeader: React.FC<ReportHeaderProps> = ({ 
  filteredRequests, 
  getPropertyName,
  onRefresh,
  currentFilters
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
    
    // Generate more descriptive file name based on applied filters
    let fileName = 'maintenance-requests';
    
    if (currentFilters) {
      if (currentFilters.propertyFilter !== 'all') {
        fileName += `-${getPropertyName(currentFilters.propertyFilter).replace(/\s+/g, '-').toLowerCase()}`;
      }
      if (currentFilters.statusFilter !== 'all') {
        fileName += `-${currentFilters.statusFilter}`;
      }
      if (currentFilters.searchTerm) {
        fileName += `-search`;
      }
    }
    
    fileName += `-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    
    // Write and download
    XLSX.writeFile(workbook, fileName);
  };

  // Generate filter summary for display
  const getFilterSummary = () => {
    if (!currentFilters) return '';
    
    const filters = [];
    if (currentFilters.propertyFilter !== 'all') {
      filters.push(`Property: ${getPropertyName(currentFilters.propertyFilter)}`);
    }
    if (currentFilters.statusFilter !== 'all') {
      filters.push(`Status: ${currentFilters.statusFilter}`);
    }
    if (currentFilters.searchTerm) {
      filters.push(`Search: "${currentFilters.searchTerm}"`);
    }
    
    return filters.length > 0 ? ` (${filters.join(', ')})` : '';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Maintenance Requests Report</h2>
          {currentFilters && getFilterSummary() && (
            <p className="text-sm text-gray-600 mt-1">
              Filtered results{getFilterSummary()}
            </p>
          )}
        </div>
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
            title={`Export ${filteredRequests.length} filtered results to Excel`}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Filtered ({filteredRequests.length})
          </Button>
        </div>
      </div>
      
      {filteredRequests.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
          <p className="text-sm text-yellow-800">
            No data matches the current filters. Adjust your filters to see results.
          </p>
        </div>
      )}
    </div>
  );
};

export default ReportHeader;
