import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';
import { MaintenanceRequest } from '@/types/maintenance';
import { PublicRequestInfo } from '@/components/request/PublicRequestInfo';
import { ActivityTimeline } from '@/components/request/ActivityTimeline';
import { PublicCommentSection } from '@/components/request/PublicCommentSection';
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
  const [propertyName, setPropertyName] = useState<string | undefined>();
  const [contractorInfo, setContractorInfo] = useState<{ companyName?: string; contactName?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

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
      const requestUrl = `https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/get-public-request-data?requestId=${encodeURIComponent(id!)}`;
      console.log('🌐 [DEBUG] Calling edge function URL:', requestUrl);
      
      const requestResponse = await fetch(requestUrl);
      console.log('📡 [DEBUG] Response status:', requestResponse.status, requestResponse.statusText);
      
      const requestResult = await requestResponse.json();
      console.log('📦 [DEBUG] Full function response:', JSON.stringify(requestResult, null, 2));

      if (!requestResponse.ok || requestResult.error) {
        console.error('❌ [DEBUG] Error from function:', requestResult.error);
        const errorMessage = requestResult.details || requestResult.error || 'Failed to load request information';
        setError(errorMessage);
        return;
      }

      if (!requestResult?.request) {
        console.log('❌ [DEBUG] No request data received');
        setError('Request not found. The maintenance request you are trying to access may have been deleted or the QR code may be invalid. Please contact your property manager.');
        return;
      }

      console.log('✅ [DEBUG] Request loaded successfully:', requestResult.request.issueNature || requestResult.request.title);
      setRequest(requestResult.request);
      
      // Set property name from response
      if (requestResult.property?.name) {
        setPropertyName(requestResult.property.name);
        console.log('✅ [DEBUG] Property name set:', requestResult.property.name);
      }
      
      // Set contractor info from response
      if (requestResult.contractor) {
        setContractorInfo({
          companyName: requestResult.contractor.company_name,
          contactName: requestResult.contractor.contact_name
        });
        console.log('✅ [DEBUG] Contractor info set:', requestResult.contractor.company_name);
      }
      
      // Set activity logs from response
      if (requestResult.activityLogs && requestResult.activityLogs.length > 0) {
        setActivityLogs(requestResult.activityLogs);
        console.log('✅ [DEBUG] Activity logs set:', requestResult.activityLogs.length, 'logs');
      } else {
        setActivityLogs([]);
      }
      
      // Fetch comments for the request
      console.log('🔍 [DEBUG] Fetching comments for request:', id);
      const commentsUrl = `https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/get-public-request-comments?requestId=${encodeURIComponent(id!)}`;
      console.log('🌐 [DEBUG] Comments URL:', commentsUrl);
      
      try {
        const commentsResponse = await fetch(commentsUrl);
        console.log('📡 [DEBUG] Comments response status:', commentsResponse.status, commentsResponse.statusText);
        
        const commentsResult = await commentsResponse.json();
        console.log('📦 [DEBUG] Comments result:', JSON.stringify(commentsResult, null, 2));
        
        if (commentsResponse.ok && commentsResult.comments) {
          console.log('✅ [DEBUG] Comments loaded:', commentsResult.comments.length);
          setComments(commentsResult.comments);
        } else {
          console.log('⚠️ [DEBUG] No comments or error fetching comments:', commentsResult.error);
          setComments([]);
        }
      } catch (commentsError) {
        console.error('❌ [DEBUG] Error fetching comments:', commentsError);
        setComments([]);
      }

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

      {/* Main Content - Public view without sidebar */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <PublicRequestInfo 
            request={request} 
            propertyName={propertyName}
            contractorInfo={contractorInfo}
          />
          <ActivityTimeline 
            request={request} 
            comments={comments}
            activityLogs={activityLogs}
          />
          <PublicCommentSection requestId={id || ''} comments={comments} />
        </div>
      </main>
      
      <Toaster position="top-right" />
    </div>
  );
};

export default PublicRequestDetail;
