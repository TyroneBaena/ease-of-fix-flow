
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { MaintenanceRequest } from '@/types/property';
import { formatDate } from '../utils/reportHelpers';

interface ReportHeaderProps {
  filteredRequests: MaintenanceRequest[];
  getPropertyName: (propertyId: string) => string;
}

const ReportHeader: React.FC<ReportHeaderProps> = ({ 
  filteredRequests, 
  getPropertyName 
}) => {
  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredRequests.map(request => ({
        'Title': request.title,
        'Property': getPropertyName(request.propertyId),
        'Category': request.category,
        'Location': request.location,
        'Priority': request.priority,
        'Status': request.status,
        'Created At': formatDate(request.createdAt),
        'Last Updated': formatDate(request.updatedAt)
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
      <Button onClick={downloadExcel} className="flex items-center">
        <Download className="mr-2 h-4 w-4" />
        Download Excel
      </Button>
    </div>
  );
};

export default ReportHeader;
