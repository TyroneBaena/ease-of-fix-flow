
import React from 'react';
import { MaintenanceRequest } from '@/types/property';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { getPriorityClass, formatDate } from '../utils/reportHelpers';
import { getDisplayStatus, getDisplayStatusColor } from '@/utils/statusDisplayUtils';

interface MaintenanceRequestsTableProps {
  filteredRequests: MaintenanceRequest[];
  getPropertyName: (propertyId: string) => string;
}

const MaintenanceRequestsTable: React.FC<MaintenanceRequestsTableProps> = ({
  filteredRequests,
  getPropertyName
}) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Issue Nature</TableHead>
            <TableHead>Property</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRequests.length > 0 ? (
            filteredRequests.map(request => {
              const displayStatus = getDisplayStatus(
                request.status, 
                (request as any).assigned_to_landlord ?? (request as any).assignedToLandlord
              );
              const statusColor = getDisplayStatusColor(displayStatus);
              
              return (
                <TableRow key={request.id}>
                  <TableCell className="font-medium">{request.issueNature || request.title}</TableCell>
                  <TableCell>{request.propertyId ? getPropertyName(request.propertyId) : 'N/A'}</TableCell>
                  <TableCell>{request.site || (request.propertyId ? getPropertyName(request.propertyId) : 'N/A')}</TableCell>
                  <TableCell>
                    <span className={`capitalize px-2 py-1 rounded-full text-xs ${getPriorityClass(request.priority)}`}>
                      {request.priority || 'Medium'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${statusColor}`}>
                      {displayStatus}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(request.createdAt)}</TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                No maintenance requests matching your filters
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default MaintenanceRequestsTable;
