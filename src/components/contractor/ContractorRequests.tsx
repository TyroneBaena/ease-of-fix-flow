
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
