
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ContractorHeader } from '@/components/contractor/ContractorHeader';
import { RequestInfo } from '@/components/request/RequestInfo';
import { QuoteForm } from '@/components/contractor/quote-dialog/QuoteForm';
import { ContractorQuoteHistory } from '@/components/contractor/quote-submission/ContractorQuoteHistory';
import { QuoteStatusCard } from '@/components/contractor/quote-submission/QuoteStatusCard';
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
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  
  const { request, loading } = useRequestDetailData(id);
  const { quotes, quoteLogs, loading: quotesLoading, refreshQuotes } = useContractorQuoteHistory(id);
  const { submitQuote } = useContractorContext();

  // Get the latest submitted quote (not 'requested' status)
  const latestSubmittedQuote = quotes.find(quote => quote.status !== 'requested');
  
  // Determine if we should show the form or status
  const shouldShowForm = showQuoteForm || !latestSubmittedQuote;

  const handleBack = () => {
    navigate('/contractor-dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate mandatory fields
    if (!amount || amount.trim() === '') {
      toast.error('Quote amount is required');
      return;
    }
    
    if (!description || description.trim() === '') {
      toast.error('Quote description is required');
      return;
    }
    
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Please enter a valid amount greater than 0');
      return;
    }

    if (!request?.id) {
      toast.error('Request information is missing');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await submitQuote(request.id, numericAmount, description.trim());
      toast.success('Quote submitted successfully');
      
      // Clear the form
      setAmount('');
      setDescription('');
      setShowQuoteForm(false);
      
      // Refresh the quote history to show the new quote and logs
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

  const handleResubmit = () => {
    // Pre-fill the form with the latest quote data if available
    if (latestSubmittedQuote) {
      setAmount(latestSubmittedQuote.amount.toString());
      setDescription(latestSubmittedQuote.description || '');
    }
    setShowQuoteForm(true);
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
          
          <h1 className="text-3xl font-bold text-gray-900">
            {shouldShowForm ? 'Submit Quote' : 'Quote Status'}
          </h1>
          <p className="text-gray-600 mt-2">
            {shouldShowForm 
              ? 'Review the request details and submit your quote'
              : 'Your quote submission status and details'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Request Information - Takes up 2/3 of the space */}
          <div className="lg:col-span-2 space-y-6">
            <RequestInfo request={request} />
            
            {/* Quote History Section with detailed logs */}
            <ContractorQuoteHistory 
              quotes={quotes} 
              quoteLogs={quoteLogs}
              loading={quotesLoading}
            />
          </div>
          
          {/* Quote Form or Status - Takes up 1/3 of the space */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-8">
              {shouldShowForm ? (
                <>
                  <h2 className="text-xl font-semibold mb-4">
                    {latestSubmittedQuote ? 'Resubmit Quote' : 'Submit Your Quote'}
                  </h2>
                  <QuoteForm
                    amount={amount}
                    description={description}
                    onAmountChange={setAmount}
                    onDescriptionChange={setDescription}
                    onSubmit={handleSubmit}
                    onCancel={handleCancel}
                    isSubmitting={isSubmitting}
                  />
                </>
              ) : (
                <QuoteStatusCard
                  quote={latestSubmittedQuote}
                  onResubmit={handleResubmit}
                  onBack={handleCancel}
                />
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default QuoteSubmission;
