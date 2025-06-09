
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ContractorHeader } from '@/components/contractor/ContractorHeader';
import { RequestInfo } from '@/components/request/RequestInfo';
import { QuoteForm } from '@/components/contractor/quote-dialog/QuoteForm';
import { ContractorQuoteHistory } from '@/components/contractor/quote-submission/ContractorQuoteHistory';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRequestDetailData } from '@/hooks/useRequestDetailData';
import { useContractorQuoteHistory } from '@/hooks/contractor/useContractorQuoteHistory';
import { useContractorContext } from '@/contexts/contractor';
import { RequestDetailLoading } from '@/components/request/detail/RequestDetailLoading';
import { RequestDetailNotFound } from '@/components/request/detail/RequestDetailNotFound';
import { toast } from 'sonner';
import { Toaster } from "sonner";

const QuoteSubmission = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { request, loading } = useRequestDetailData(id);
  const { quotes, loading: quotesLoading, refreshQuotes } = useContractorQuoteHistory(id);
  const { submitQuote } = useContractorContext();

  const handleBack = () => {
    navigate('/contractor-dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!request?.id || !amount || !description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await submitQuote(request.id, parseFloat(amount), description);
      toast.success('Quote submitted successfully');
      
      // Clear the form
      setAmount('');
      setDescription('');
      
      // Refresh the quote history to show the new quote
      await refreshQuotes();
    } catch (error) {
      console.error('Error submitting quote:', error);
      toast.error('Failed to submit quote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/contractor-dashboard');
  };

  if (loading) {
    return <RequestDetailLoading />;
  }

  if (!request) {
    return <RequestDetailNotFound onBackClick={handleBack} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ContractorHeader />
      <Toaster position="top-right" />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900">Submit Quote</h1>
          <p className="text-gray-600 mt-2">
            Review the request details and submit your quote
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Request Information - Takes up 2/3 of the space */}
          <div className="lg:col-span-2 space-y-6">
            <RequestInfo request={request} />
            
            {/* Quote History Section */}
            <ContractorQuoteHistory 
              quotes={quotes} 
              loading={quotesLoading}
            />
          </div>
          
          {/* Quote Form - Takes up 1/3 of the space */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-8">
              <h2 className="text-xl font-semibold mb-4">Submit Your Quote</h2>
              <QuoteForm
                amount={amount}
                description={description}
                onAmountChange={setAmount}
                onDescriptionChange={setDescription}
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
              />
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default QuoteSubmission;
