
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
  filterQuoteRequests?: boolean;
}

export const RequestsTable = ({ requests, onSelectRequest, filterQuoteRequests = false }: RequestsTableProps) => {
  const navigate = useNavigate();
  
  // Apply filtering for quote requests section to show all relevant statuses
  const filteredRequests = filterQuoteRequests 
    ? requests.filter(request => {
        // For quote requests section: show requests in various quote stages
        if (request.quote && typeof request.quote !== 'string') {
          const includeStatuses = ['requested', 'pending', 'submitted'];
          const shouldInclude = includeStatuses.includes(request.quote.status);
          console.log(`RequestsTable - Quote request ${request.id}: status = ${request.quote.status}, include = ${shouldInclude}`);
          return shouldInclude;
        }
        
        // Legacy support: requests where quoteRequested is true but no quote object exists yet
        const isLegacy = request.quoteRequested === true && !request.quotedAmount && !request.quote;
        console.log(`RequestsTable - Legacy request ${request.id}: quoteRequested = ${request.quoteRequested}, include = ${isLegacy}`);
        return isLegacy;
      })
    : requests.filter(request => {
        // For job lists: show all jobs that are in-progress or completed status
        // This includes assigned jobs regardless of quote status
        const isJob = request.status === 'in-progress' || request.status === 'completed';
        
        console.log(`RequestsTable - Job ${request.id}: isJob = ${isJob}, status = ${request.status}`);
        return isJob;
      });
  
  console.log('RequestsTable - Filter type:', filterQuoteRequests ? 'quote requests' : 'jobs');
  console.log('RequestsTable - Original requests:', requests.length);
  console.log('RequestsTable - Filtered requests:', filteredRequests.length);
  console.log('RequestsTable - Filtered requests data:', filteredRequests.map(r => ({
    id: r.id.substring(0, 8),
    title: r.title,
    status: r.status,
    quoteStatus: r.quote && typeof r.quote !== 'string' ? r.quote.status : 'no quote',
    quoteRequested: r.quoteRequested
  })));
  
  if (filteredRequests.length === 0) {
    return <EmptyState />;
  }

  const handleRowClick = (request: MaintenanceRequest) => {
    console.log('RequestsTable - Row clicked:', request.id);
    console.log('RequestsTable - Request quote status:', request.quote);
    
    // For quote requests that need quotes to be submitted by contractors
    if (filterQuoteRequests) {
      // Always open the quote submission dialog for quote requests
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
    // If we're in quote requests section, show quote-specific statuses
    if (filterQuoteRequests) {
      if (request.quote && typeof request.quote !== 'string') {
        switch (request.quote.status) {
          case 'requested': return 'Quote Requested';
          case 'pending': return 'Quote Submitted';
          case 'submitted': return 'Awaiting Approval';
          default: return 'Quote Requested';
        }
      }
      
      // Check if quote is requested via the boolean flag
      if (request.quoteRequested) {
        return 'Quote Requested';
      }
      
      return 'Quote Requested';
    }
    
    // For jobs section, show job status
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
    // If we're in quote requests section, use quote colors
    if (filterQuoteRequests) {
      if (request.quote && typeof request.quote !== 'string') {
        return getQuoteStatusBadgeColor(request.quote.status);
      }
      
      // Default for quote requests
      return getQuoteStatusBadgeColor('requested');
    }
    
    // For jobs section, use job status colors
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
              {filterQuoteRequests ? (
                // For quote requests, show quote amount if submitted, otherwise "Not quoted"
                request.quote && typeof request.quote !== 'string' && request.quote.amount && request.quote.amount > 1
                  ? `$${request.quote.amount}`
                  : request.quotedAmount 
                    ? `$${request.quotedAmount}`
                    : 'Not quoted'
              ) : (
                request.quotedAmount 
                  ? `$${request.quotedAmount}` 
                  : request.quote && typeof request.quote !== 'string' && request.quote.amount
                    ? `$${request.quote.amount}` 
                    : 'Not quoted'
              )}
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
