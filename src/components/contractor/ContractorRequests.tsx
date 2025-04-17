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
    description: 'Large crack in the front window of the main office. Possible safety hazard.',
    location: 'Main Office - Front Entrance',
    priority: 'High',
    site: 'Downtown Medical Center',
    submittedBy: 'John Smith',
    contactNumber: '(555) 123-4567',
    address: '123 Medical Drive, Suite 100, City, State 12345',
    practiceLeader: 'Dr. Sarah Johnson',
    practiceLeaderPhone: '(555) 987-6543',
    attachments: [
      { url: 'https://images.unsplash.com/photo-1527853787696-f7be74f2e39a?auto=format&fit=crop&q=80&w=2070' },
      { url: 'https://images.unsplash.com/photo-1555116505-38ab61800975?auto=format&fit=crop&q=80&w=2070' },
    ],
  },
  {
    id: 'REQ-002',
    title: 'HVAC Maintenance',
    status: 'pending',
    quote: 'Quote Requested',
    date: '2025-04-17',
    description: 'Annual HVAC system maintenance and filter replacement needed. Unit is making unusual noise.',
    location: 'Building Roof - HVAC Unit #2',
    priority: 'Medium',
    site: 'North Medical Plaza',
    submittedBy: 'Jane Doe',
    contactNumber: '(555) 234-5678',
    address: '456 Health Way, City, State 12345',
    practiceLeader: 'Dr. Michael Brown',
    practiceLeaderPhone: '(555) 876-5432',
    attachments: [
      { url: 'https://images.unsplash.com/photo-1581093458791-9d09c85a864f?auto=format&fit=crop&q=80&w=2070' },
    ],
  },
];

export const ContractorRequests = () => {
  const [selectedRequest, setSelectedRequest] = React.useState<typeof mockRequests[0] | null>(null);

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
    console.log('Quote submitted:', { 
      requestId: selectedRequest?.id, 
      amount, 
      description 
    });
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
