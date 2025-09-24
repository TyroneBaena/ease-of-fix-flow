import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, MapPin, User, Building, Calendar } from 'lucide-react';
import { MaintenanceRequest } from '@/types/maintenance';

/**
 * Public request detail page for QR code access
 * Shows request details without requiring authentication
 */
const PublicRequestDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
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

    } catch (error) {
      console.error('💥 [DEBUG] Unexpected error:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending': case 'open': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'in-progress': case 'in_progress': return 'In Progress';
      case 'pending': return 'Pending';
      case 'open': return 'Open';
      case 'completed': return 'Completed';
      default: return status?.charAt(0).toUpperCase() + status?.slice(1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Request Not Found</h1>
          <p className="text-muted-foreground mb-4">The requested maintenance request could not be found.</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate(-1)}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                {request.issueNature || request.title || 'Maintenance Request'}
              </h1>
              <p className="text-muted-foreground mt-1">
                Request ID: {request.id?.substring(0, 8)}...
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Status and Basic Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Request Details</CardTitle>
                <Badge className={getStatusColor(request.status)}>
                  {getStatusDisplay(request.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Submitted:</strong> {request.reportDate || new Date(request.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Location:</strong> {request.location || request.site}
                  </span>
                </div>
                {request.submittedBy && (
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Submitted by:</strong> {request.submittedBy}
                    </span>
                  </div>
                )}
                {request.assignedTo && (
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Assigned to:</strong> {request.assignedTo}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Issue Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Issue Description</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Nature of Issue:</h4>
                <p className="text-muted-foreground">
                  {request.issueNature || request.title || 'No description provided'}
                </p>
              </div>
              
              {(request.explanation || request.description) && (
                <div>
                  <h4 className="font-semibold mb-2">Detailed Explanation:</h4>
                  <p className="text-muted-foreground">
                    {request.explanation || request.description}
                  </p>
                </div>
              )}

              {request.attemptedFix && (
                <div>
                  <h4 className="font-semibold mb-2">Attempted Fix:</h4>
                  <p className="text-muted-foreground">
                    {request.attemptedFix}
                  </p>
                </div>
              )}

              {request.isParticipantRelated && request.participantName && (
                <div>
                  <h4 className="font-semibold mb-2">Participant Related:</h4>
                  <p className="text-muted-foreground">
                    Yes - {request.participantName}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          {request.attachments && Array.isArray(request.attachments) && request.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Attachments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {request.attachments.map((attachment, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      {attachment.url && (
                        <a 
                          href={attachment.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {attachment.name || `Attachment ${index + 1}`}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress */}
          {request.completionPercentage > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Completion</span>
                    <span>{request.completionPercentage}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${request.completionPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicRequestDetail;