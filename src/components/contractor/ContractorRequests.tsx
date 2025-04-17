
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from 'date-fns';

// Mock data for maintenance requests
const mockRequests = [
  {
    id: 'REQ-2023-001',
    title: 'Broken Air Conditioning Unit',
    status: 'pending',
    quote: '-',
    date: new Date('2023-04-10').toISOString(),
    description: 'The air conditioning unit in the main conference room is not functioning properly.',
    location: 'Conference Room A, 2nd Floor',
    priority: 'high',
    site: 'Dental Practice LLC',
    submittedBy: 'Jane Smith',
    contactNumber: '555-123-4567',
    address: '123 Main Street, Suite 100',
    practiceLeader: 'Dr. John Brown',
    practiceLeaderPhone: '555-987-6543',
    attachments: [
      { url: '/placeholder.svg' },
      { url: '/placeholder.svg' }
    ]
  },
  {
    id: 'REQ-2023-002',
    title: 'Leaking Faucet',
    status: 'in-progress',
    quote: '$350',
    date: new Date('2023-04-05').toISOString(),
    description: 'The sink faucet in the staff break room is constantly leaking.',
    location: 'Break Room, 1st Floor',
    priority: 'medium'
  },
  {
    id: 'REQ-2023-003',
    title: 'Light Fixtures Replacement',
    status: 'completed',
    quote: '$750',
    date: new Date('2023-03-28').toISOString(),
    description: 'Three light fixtures in the reception area need to be replaced.',
    location: 'Reception, Main Entrance',
    priority: 'low'
  },
  {
    id: 'REQ-2023-004',
    title: 'Parking Lot Pothole Repair',
    status: 'pending',
    quote: '-',
    date: new Date('2023-04-12').toISOString(),
    description: 'Large pothole in the staff parking area needs to be filled.',
    location: 'Staff Parking Lot, Section B',
    priority: 'medium'
  },
  {
    id: 'REQ-2023-005',
    title: 'Waiting Room Chair Repair',
    status: 'in-progress',
    quote: '$200',
    date: new Date('2023-04-08').toISOString(),
    description: 'Two chairs in the waiting room have damaged armrests.',
    location: 'Patient Waiting Area',
    priority: 'low'
  },
  {
    id: 'REQ-2023-006',
    title: 'Roof Leak Inspection',
    status: 'completed',
    quote: '$1,200',
    date: new Date('2023-03-15').toISOString(),
    description: 'Water stains on ceiling indicating possible roof leak.',
    location: 'X-ray Room, 2nd Floor',
    priority: 'high'
  }
];

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

const groupRequestsByStatus = (requests: any[]) => {
  return requests.reduce((acc, request) => {
    const status = request.status;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(request);
    return acc;
  }, {} as Record<string, any[]>);
};

const RequestsTable = ({ requests, onSelectRequest }: { requests: any[], onSelectRequest: (request: any) => void }) => (
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

export const ContractorRequests = () => {
  const [selectedRequest, setSelectedRequest] = React.useState<typeof mockRequests[0] | null>(null);
  
  const groupedRequests = groupRequestsByStatus(mockRequests);

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
        <h2 className="text-xl font-semibold mb-6">Maintenance Requests</h2>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="pending" className="relative">
              Pending
              {groupedRequests.pending?.length > 0 && (
                <Badge className="ml-2 bg-yellow-100 text-yellow-800">
                  {groupedRequests.pending.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="in-progress">
              In Progress
              {groupedRequests['in-progress']?.length > 0 && (
                <Badge className="ml-2 bg-blue-100 text-blue-800">
                  {groupedRequests['in-progress'].length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed
              {groupedRequests.completed?.length > 0 && (
                <Badge className="ml-2 bg-green-100 text-green-800">
                  {groupedRequests.completed.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="mt-0">
            <div className="overflow-x-auto">
              <RequestsTable 
                requests={groupedRequests.pending || []} 
                onSelectRequest={setSelectedRequest}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="in-progress" className="mt-0">
            <div className="overflow-x-auto">
              <RequestsTable 
                requests={groupedRequests['in-progress'] || []} 
                onSelectRequest={setSelectedRequest}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="completed" className="mt-0">
            <div className="overflow-x-auto">
              <RequestsTable 
                requests={groupedRequests.completed || []} 
                onSelectRequest={setSelectedRequest}
              />
            </div>
          </TabsContent>
        </Tabs>
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
