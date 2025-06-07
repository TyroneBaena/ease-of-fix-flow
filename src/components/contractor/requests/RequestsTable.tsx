
import { MaintenanceRequest } from '@/types/maintenance';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { EmptyState } from './EmptyState';
import { getStatusBadgeColor, getQuoteStatusBadgeColor } from '../utils/statusBadgeUtils';
import { useNavigate } from 'react-router-dom';

interface RequestsTableProps {
  requests: MaintenanceRequest[];
  onSelectRequest: (request: MaintenanceRequest) => void;
}

export const RequestsTable = ({ requests, onSelectRequest }: RequestsTableProps) => {
  const navigate = useNavigate();
  
  // Filter out quote requests that have been accepted/converted into jobs
  const filteredRequests = requests.filter(request => {
    // If the request has a quote object with approved status, it's been converted to a job
    if (request.quote && typeof request.quote !== 'string' && request.quote.status === 'approved') {
      return false;
    }
    return true;
  });
  
  if (filteredRequests.length === 0) {
    return <EmptyState />;
  }

  const handleRowClick = (request: MaintenanceRequest) => {
    // For quote requests that need to be submitted, use the RequestQuoteDialog 
    // instead of QuoteRequestDialog
    if (request.status === 'pending' && request.quote && 
        typeof request.quote !== 'string' && 
        request.quote.status === 'requested') {
      onSelectRequest(request);
      return;
    }
    
    // For jobs in progress or completed, navigate to the job detail page
    if (request.id) {
      navigate(`/contractor-jobs/${request.id}`);
    }
  };

  // Function to determine the display status based on request and quote status
  const getDisplayStatus = (request: MaintenanceRequest): string => {
    // If the request has a quote object with status, show combined status
    if (request.quote && typeof request.quote !== 'string') {
      switch (request.quote.status) {
        case 'requested': return 'Quote Requested';
        case 'pending': return 'Quote Submitted';
        case 'approved': return 'Quote Approved';
        case 'rejected': return 'Quote Rejected';
      }
    }
    
    // Otherwise show request status with proper formatting
    switch (request.status) {
      case 'pending': return 'Pending';
      case 'in-progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'open': return 'Open';
      default: return request.status;
    }
  };
  
  // Function to determine badge color based on combined status
  const getBadgeColor = (request: MaintenanceRequest): string => {
    // If the request has a quote object with status
    if (request.quote && typeof request.quote !== 'string') {
      return getQuoteStatusBadgeColor(request.quote.status);
    }
    
    // Fallback to regular status badge color
    return getStatusBadgeColor(request.status);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Request ID</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Quote</TableHead>
          <TableHead>Submitted</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredRequests.map((request) => (
          <TableRow
            key={request.id}
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => handleRowClick(request)}
          >
            <TableCell className="font-mono text-sm">{request.id.substring(0, 8)}</TableCell>
            <TableCell className="font-medium">{request.title}</TableCell>
            <TableCell>
              <Badge className={getBadgeColor(request)}>
                {getDisplayStatus(request)}
              </Badge>
            </TableCell>
            <TableCell>
              {request.quotedAmount 
                ? `$${request.quotedAmount}` 
                : request.quote && typeof request.quote !== 'string' && request.quote.amount
                  ? `$${request.quote.amount}` 
                  : 'Not quoted'
              }
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {request.date ? formatDistanceToNow(new Date(request.date), { addSuffix: true }) : 'Unknown'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
