
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { ContractorProvider } from '@/contexts/contractor';
import { QuoteRequestDialog } from '@/components/contractor/QuoteRequestDialog';
import { useRequestDetailData } from '@/hooks/useRequestDetailData';
import { RequestDetailLoading } from '@/components/request/detail/RequestDetailLoading';
import { RequestDetailNotFound } from '@/components/request/detail/RequestDetailNotFound';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Toaster } from "sonner";

const QuoteRequest = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { 
    request, 
    loading, 
    refreshData
  } = useRequestDetailData(id);
  
  const handleBack = () => {
    navigate(`/request/${id}`);
  };

  const handleSuccess = () => {
    // Navigate back to request detail page after successful quote request
    navigate(`/request/${id}`);
  };

  if (loading) {
    return <RequestDetailLoading />;
  }

  if (!request) {
    return <RequestDetailNotFound onBackClick={handleBack} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Request
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Request Quotes
          </h1>
          <p className="text-gray-600">
            Send quote requests to contractors for: <span className="font-medium">{request.title}</span>
          </p>
        </div>

        <Card className="p-6">
          <ContractorProvider>
            <QuoteRequestDialog
              open={true}
              onOpenChange={(open) => {
                if (!open) {
                  handleBack();
                }
              }}
              requestDetails={request}
              onSubmitQuote={() => {}} // Not used in this context
              onSuccess={handleSuccess}
            />
          </ContractorProvider>
        </Card>
      </main>
      
      <Toaster position="top-right" />
    </div>
  );
};

export default QuoteRequest;
