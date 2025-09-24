import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { MaintenanceRequest } from '@/types/maintenance';
import { RequestInfo } from '@/components/request/RequestInfo';
import { ActivityTimeline } from '@/components/request/ActivityTimeline';
import { PublicCommentSection } from '@/components/request/PublicCommentSection';
import { PublicRequestDetailSidebar } from '@/components/request/PublicRequestDetailSidebar';
import { Toaster } from "sonner";

/**
 * Public request detail page for QR code access
 * Shows full request details with all features matching desktop version
 */
const PublicRequestDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [requestQuoteDialogOpen, setRequestQuoteDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRequestData();
    }
  }, [id]);

  const fetchRequestData = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔍 [DEBUG] Fetching public request data for ID:', id);

      // Use the edge function to safely fetch request data
      const url = `https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/get-public-request-data?requestId=${encodeURIComponent(id!)}`;
      console.log('🌐 [DEBUG] Calling edge function URL:', url);
      
      const response = await fetch(url);
      console.log('📡 [DEBUG] Response status:', response.status, response.statusText);
      
      const result = await response.json();
      console.log('📦 [DEBUG] Full function response:', JSON.stringify(result, null, 2));

      if (!response.ok || result.error) {
        console.error('❌ [DEBUG] Error from function:', result.error);
        setError(result.error || 'Failed to load request information');
        return;
      }

      if (!result?.request) {
        console.log('❌ [DEBUG] No request data received');
        setError('Request not found');
        return;
      }

      console.log('✅ [DEBUG] Request loaded successfully:', result.request.issueNature || result.request.title);
      setRequest(result.request);
      
      // Mock data for features that require authentication context
      setComments([]);
      setActivityLogs([]);
      setQuotes([]);

    } catch (error) {
      console.error('💥 [DEBUG] Unexpected error:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = useCallback(() => {
    fetchRequestData();
  }, []);

  const refreshAfterQuoteSubmission = useCallback(() => {
    setTimeout(() => {
      refreshData();
    }, 500);
  }, [refreshData]);

  const handleNavigateBack = useCallback(() => navigate(-1), [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Request Not Found</h1>
          <p className="text-muted-foreground mb-4">The requested maintenance request could not be found.</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleNavigateBack}
            className="flex items-center mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Property
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Request Details</h1>
        </div>
      </div>

      {/* Main Content - Exactly matching desktop layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <RequestInfo request={request} />
            <ActivityTimeline 
              request={request} 
              comments={comments}
              activityLogs={activityLogs}
            />
            <PublicCommentSection requestId={id || ''} />
          </div>
          
          <PublicRequestDetailSidebar request={request} />
        </div>
      </main>
      
      <Toaster position="top-right" />
    </div>
  );
};

export default PublicRequestDetail;