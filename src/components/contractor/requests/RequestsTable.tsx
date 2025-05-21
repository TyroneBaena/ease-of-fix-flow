
import { MaintenanceRequest } from '@/types/maintenance';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { EmptyState } from './EmptyState';
import { getStatusBadgeColor } from '../utils/statusBadgeUtils';
import { useNavigate } from 'react-router-dom';

interface RequestsTableProps {
  requests: MaintenanceRequest[];
  onSelectRequest: (request: MaintenanceRequest) => void;
}

export const RequestsTable = ({ requests, onSelectRequest }: RequestsTableProps) => {
  const navigate = useNavigate();
  
  if (requests.length === 0) {
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
        {requests.map((request) => (
          <TableRow
            key={request.id}
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => handleRowClick(request)}
          >
            <TableCell className="font-mono text-sm">{request.id.substring(0, 8)}</TableCell>
            <TableCell className="font-medium">{request.title}</TableCell>
            <TableCell>
              <Badge className={getStatusBadgeColor(request.status)}>
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
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
