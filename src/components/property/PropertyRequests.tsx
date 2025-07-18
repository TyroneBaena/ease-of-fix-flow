
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MaintenanceRequest } from '@/types/property';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ClipboardList } from 'lucide-react';
import { formatTimestamp } from '@/components/request/detail/utils/dateUtils';

interface PropertyRequestsProps {
  requests: MaintenanceRequest[];
  propertyId: string;
}

export const PropertyRequests: React.FC<PropertyRequestsProps> = ({ requests, propertyId }) => {
  const navigate = useNavigate();

  // Debug: log the requests to see what data we're working with
  console.log('PropertyRequests: requests data:', requests);

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <ClipboardList className="h-5 w-5 mr-2" />
          Maintenance Requests
        </CardTitle>
        <CardDescription>
          All maintenance requests for this property
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No maintenance requests for this property yet.</p>
            <Button
              className="mt-4"
              onClick={() => navigate(`/new-request?propertyId=${propertyId}`)}
            >
              Create Maintenance Request
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Issue Nature</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((request) => {
                // Debug: log each request's date fields
                console.log(`Request ${request.id} - reportDate:`, request.reportDate, 'createdAt:', request.createdAt);
                
                return (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.issueNature || request.title}</TableCell>
                    <TableCell>{request.site || request.category || 'N/A'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${
                        (request.priority === 'high') ? 'bg-red-100 text-red-800' : 
                        (request.priority === 'medium') ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-green-100 text-green-800'
                      }`}>
                        {request.priority || 'Medium'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${
                        request.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        request.status === 'in_progress' || request.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {request.status}
                      </span>
                    </TableCell>
                    <TableCell>{formatTimestamp(request.reportDate || request.createdAt)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/requests/${request.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
