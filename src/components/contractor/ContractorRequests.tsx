
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QuoteRequestDialog } from './QuoteRequestDialog';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MaintenanceRequest } from '@/types/maintenance';
import { RequestsTable } from './requests/RequestsTable';
import { useContractorContext } from '@/contexts/contractor';

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
  const { requestQuote } = useContractorContext();
  
  // Fetch maintenance requests that have quote_requested = true
  const [requests, setRequests] = React.useState<MaintenanceRequest[]>([]);

  React.useEffect(() => {
    const fetchQuoteRequests = async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('quote_requested', true);
      
      if (error) {
        console.error('Error fetching requests:', error);
        return;
      }

      if (data) {
        setRequests(data);
      }
    };

    fetchQuoteRequests();
  }, []);
  
  const groupedRequests = groupRequestsByStatus(requests);

  const handleSubmitQuote = async (amount: number, description: string) => {
    if (!selectedRequest) return;
    
    setIsLoading(true);
    try {
      await requestQuote(selectedRequest.id, amount, description);
      toast.success('Quote submitted successfully');
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error submitting quote:', error);
      toast.error('Failed to submit quote');
    } finally {
      setIsLoading(false);
    }
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
        request={selectedRequest}
        onSubmitQuote={handleSubmitQuote}
      />
    </Card>
  );
};
