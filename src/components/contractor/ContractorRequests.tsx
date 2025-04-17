
import React from 'react';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { QuoteRequestDialog } from './QuoteRequestDialog';
import { toast } from 'sonner';

const mockRequests = [
  {
    id: 'REQ-001',
    title: 'Fix Broken Window',
    status: 'in-progress',
    quote: '$350',
    date: '2025-04-15',
  },
  {
    id: 'REQ-002',
    title: 'HVAC Maintenance',
    status: 'pending',
    quote: 'Quote Requested',
    date: '2025-04-17',
  },
];

export const ContractorRequests = () => {
  const [selectedRequest, setSelectedRequest] = React.useState<{
    id: string;
    title: string;
    date: string;
  } | null>(null);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmitQuote = (amount: number, description: string) => {
    console.log('Quote submitted:', { requestId: selectedRequest?.id, amount, description });
    toast.success('Quote submitted successfully');
  };

  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-6">Recent Requests</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Quote</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockRequests.map((request) => (
                <TableRow
                  key={request.id}
                  className={request.status === 'pending' ? 'cursor-pointer hover:bg-gray-50' : ''}
                  onClick={() => {
                    if (request.status === 'pending') {
                      setSelectedRequest(request);
                    }
                  }}
                >
                  <TableCell>{request.id}</TableCell>
                  <TableCell>{request.title}</TableCell>
                  <TableCell>
                    <Badge className={getStatusBadgeColor(request.status)}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{request.quote}</TableCell>
                  <TableCell>{request.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <QuoteRequestDialog
        open={!!selectedRequest}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
        requestDetails={selectedRequest}
        onSubmitQuote={handleSubmitQuote}
      />
    </Card>
  );
};
