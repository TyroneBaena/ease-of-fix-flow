
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { RequestInfo } from '@/components/request/RequestInfo';
import { CommentSection } from '@/components/request/CommentSection';
import { RequestActions } from '@/components/request/RequestActions';
import { RequestHistory } from '@/components/request/RequestHistory';
import { useMaintenanceRequestContext } from '@/contexts/maintenance';
import { ContractorAssignment } from '@/components/request/ContractorAssignment';
import { ContractorProvider } from '@/contexts/contractor';
import { RequestQuoteDialog } from '@/components/contractor/RequestQuoteDialog';
import { QuotesList } from '@/components/request/QuotesList';
import { Quote } from '@/types/contractor';
import { supabase } from '@/lib/supabase';

const RequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { requests } = useMaintenanceRequestContext();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  
  useEffect(() => {
    if (id) {
      const foundRequest = requests.find(req => req.id === id);
      setRequest(foundRequest);
      setLoading(false);
      
      const fetchQuotes = async () => {
        const { data, error } = await supabase
          .from('quotes')
          .select('*')
          .eq('request_id', id)
          .order('created_at', { ascending: false });
          
        if (!error && data) {
          // Map database fields to our interface fields
          const mappedQuotes: Quote[] = data.map(quote => ({
            id: quote.id,
            requestId: quote.request_id,
            contractorId: quote.contractor_id,
            amount: quote.amount,
            description: quote.description || undefined,
            status: quote.status as 'pending' | 'approved' | 'rejected',
            submittedAt: quote.submitted_at,
            approvedAt: quote.approved_at || undefined,
            createdAt: quote.created_at,
            updatedAt: quote.updated_at
          }));
          
          setQuotes(mappedQuotes);
        }
      };
      
      fetchQuotes();
    }
  }, [id, requests]);
  
  const initialComments = [
    {
      id: '1',
      user: 'John Doe',
      role: 'Maintenance Supervisor',
      avatar: '/placeholder.svg',
      text: 'I\'ve assigned this to our electrical team. They will visit tomorrow morning between 9-11 AM. Please ensure access to the location.',
      timestamp: '2 days ago'
    },
    {
      id: '2',
      user: 'Sarah Smith',
      role: 'Requester',
      avatar: '/placeholder.svg',
      text: 'Thank you. I\'ll make sure someone is available to provide access during that time.',
      timestamp: '1 day ago'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <p>Loading request...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button 
            variant="ghost" 
            className="mb-6"
            onClick={() => navigate('/requests')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Requests
          </Button>
          
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Request not found</h2>
            <p className="text-gray-500 mb-6">The maintenance request you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/requests')}>
              View all requests
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => navigate('/requests')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Requests
        </Button>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <RequestInfo request={request} />
            <CommentSection initialComments={initialComments} />
          </div>
          
          <div className="space-y-6">
            <ContractorProvider>
              <ContractorAssignment 
                requestId={request.id} 
                isAssigned={!!request.contractor_id}
                onOpenQuoteDialog={() => setQuoteDialogOpen(true)}
              />
              
              <QuotesList requestId={request.id} quotes={quotes} />
              
              <RequestQuoteDialog 
                open={quoteDialogOpen} 
                onOpenChange={setQuoteDialogOpen} 
                request={request}
              />
            </ContractorProvider>
            
            <RequestActions status={request.status} />
            <RequestHistory history={request.history} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default RequestDetail;
