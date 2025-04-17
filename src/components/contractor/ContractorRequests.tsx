
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QuoteRequestDialog } from './QuoteRequestDialog';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaintenanceRequest } from '@/types/maintenance';
import { RequestsTable } from './requests/RequestsTable';
import { mockRequests } from './data/mockRequests';

const groupRequestsByStatus = (requests: MaintenanceRequest[]) => {
  return requests.reduce((acc, request) => {
    const status = request.status;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(request);
    return acc;
  }, {} as Record<string, MaintenanceRequest[]>);
};

export const ContractorRequests = () => {
  const [selectedRequest, setSelectedRequest] = React.useState<MaintenanceRequest | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  
  const groupedRequests = groupRequestsByStatus(mockRequests);

  const handleSubmitQuote = (amount: number, description: string) => {
    setIsLoading(true);
    setTimeout(() => {
      console.log('Quote submitted:', { 
        requestId: selectedRequest?.id, 
        amount, 
        description 
      });
      toast.success('Quote submitted successfully');
      setIsLoading(false);
      setSelectedRequest(null);
    }, 1000);
  };

  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-6">Maintenance Requests</h2>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-4">
            {(['pending', 'in-progress', 'completed'] as const).map((status) => (
              <TabsTrigger key={status} value={status} className="relative capitalize">
                {status.replace('-', ' ')}
                {groupedRequests[status]?.length > 0 && (
                  <Badge className={`ml-2`}>
                    {groupedRequests[status].length}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {(['pending', 'in-progress', 'completed'] as const).map((status) => (
            <TabsContent key={status} value={status} className="mt-0">
              <div className="overflow-x-auto">
                <RequestsTable 
                  requests={groupedRequests[status] || []} 
                  onSelectRequest={setSelectedRequest}
                />
              </div>
            </TabsContent>
          ))}
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
