
import { MaintenanceRequest } from '@/types/maintenance';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { EmptyState } from './EmptyState';
import { getStatusBadgeColor } from '../utils/statusBadgeUtils';

interface RequestsTableProps {
  requests: MaintenanceRequest[];
  onSelectRequest: (request: MaintenanceRequest) => void;
}

export const RequestsTable = ({ requests, onSelectRequest }: RequestsTableProps) => {
  if (requests.length === 0) {
    return <EmptyState />;
  }

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
            className={request.status === 'pending' ? 'cursor-pointer hover:bg-gray-50' : ''}
            onClick={() => {
              if (request.status === 'pending') {
                onSelectRequest(request);
              }
            }}
          >
            <TableCell className="font-mono text-sm">{request.id}</TableCell>
            <TableCell className="font-medium">{request.title}</TableCell>
            <TableCell>
              <Badge className={getStatusBadgeColor(request.status)}>
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </Badge>
            </TableCell>
            <TableCell>{request.quote}</TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {formatDistanceToNow(new Date(request.date), { addSuffix: true })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
