import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Loader2, CheckCircle2, RotateCcw, Building } from 'lucide-react';
import { useMaintenanceChat, MaintenanceFormData } from '@/hooks/useMaintenanceChat';
import { RequestFormAttachments } from './RequestFormAttachments';
import { useFileUpload } from '@/hooks/useFileUpload';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { usePublicPropertyContextSafe } from '@/contexts/property/PublicPropertyProvider';
import { useMaintenanceRequestContext } from '@/contexts/maintenance/MaintenanceRequestContext';
import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';
import { useHousemates } from '@/hooks/useHousemates';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface MaintenanceRequestChatProps {
  propertyId?: string;
  isPublic?: boolean;
}

interface PreviousRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  location: string;
  created_at: string;
}

export const MaintenanceRequestChat: React.FC<MaintenanceRequestChatProps> = ({ 
  propertyId: propPropertyId,
  isPublic = false 
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propertyIdFromUrl = propPropertyId || searchParams.get('propertyId');
  
  // Get properties based on public/private context
  const privatePropertyContext = usePropertyContext();
  const publicPropertyContext = usePublicPropertyContextSafe();
  const properties = (isPublic && publicPropertyContext) 
    ? publicPropertyContext.properties 
    : privatePropertyContext.properties;
  
  // For public flow, check if property data is loading or has error
  const publicLoading = isPublic && publicPropertyContext?.loading;
  const publicError = isPublic && publicPropertyContext?.error;
  
  // Property selection state - initialized from URL for public users
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    () => propertyIdFromUrl || null
  );
  // Auto-start chat for public users with propertyId in URL
  const [hasStartedChat, setHasStartedChat] = useState(
    () => isPublic && !!propertyIdFromUrl
  );
  
  // Determine if property is ready (loaded and found in properties array)
  const propertyReady = !selectedPropertyId || properties.some(p => p.id === selectedPropertyId);
  
  // Auto-select property when coming from URL (for authenticated users clicking from property page)
  useEffect(() => {
    if (propertyIdFromUrl && !isPublic) {
      setSelectedPropertyId(propertyIdFromUrl);
    }
  }, [isPublic, propertyIdFromUrl]);
  
  // Fetch housemates for the selected property (authenticated users only)
  const { housemates, fetchHousemates } = useHousemates();
  
  // Get housemates from public context for public users
  const publicHousemates = (isPublic && publicPropertyContext) 
    ? publicPropertyContext.housemates || []
    : [];
  
  // Use appropriate housemates based on context
  const effectiveHousemates = isPublic ? publicHousemates : housemates;
  
  // Fetch housemates when property is selected (authenticated users)
  useEffect(() => {
    if (selectedPropertyId && !isPublic) {
      fetchHousemates(selectedPropertyId, false);
    }
  }, [selectedPropertyId, isPublic, fetchHousemates]);

  // Fetch previous maintenance requests for context (authenticated users only)
  const [previousRequests, setPreviousRequests] = useState<PreviousRequest[]>([]);
  
  useEffect(() => {
    // Skip for public users - RLS won't allow access anyway
    if (!selectedPropertyId || isPublic) {
      setPreviousRequests([]);
      return;
    }
    
    const fetchPreviousRequests = async () => {
      try {
        const { data, error } = await supabase
          .from('maintenance_requests')
          .select('id, title, description, category, status, location, created_at')
          .eq('property_id', selectedPropertyId)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error) {
          console.error('Error fetching previous requests:', error);
          setPreviousRequests([]);
          return;
        }
        
        setPreviousRequests(data || []);
      } catch (err) {
        console.error('Failed to fetch previous requests:', err);
        setPreviousRequests([]);
      }
    };
    
    fetchPreviousRequests();
  }, [selectedPropertyId, isPublic]);
  
  // Pass properties, selected property, housemates, and previous requests to the chat hook
  const { 
    messages, 
    isLoading, 
    isReady, 
    formData, 
    sendMessage, 
    resetChat, 
    initializeChat,
    showFrustratedPopup,
    dismissFrustratedPopup,
  } = useMaintenanceChat(
    properties,
    selectedPropertyId || undefined,
    effectiveHousemates.map(h => ({ firstName: h.firstName, lastName: h.lastName })),
    previousRequests
  );
  const { uploadFiles, isUploading } = useFileUpload();
  const { addRequestToProperty } = useMaintenanceRequestContext();
  const { currentUser } = useSimpleAuth();
  
  const [inputValue, setInputValue] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [showPhotoError, setShowPhotoError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // The effective property ID - from selection OR extracted from AI conversation
  const effectivePropertyId = selectedPropertyId || formData?.propertyId;
  const selectedProperty = properties.find(p => p.id === effectivePropertyId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize chat with AI greeting when chat has started AND property is ready
  useEffect(() => {
    if (hasStartedChat && messages.length === 0 && propertyReady) {
      initializeChat();
    }
  }, [hasStartedChat, messages.length, initializeChat, propertyReady]);

  // Handle starting the chat after property selection
  const handleStartChat = () => {
    if (!selectedPropertyId) {
      toast.error('Please select a property first.');
      return;
    }
    setHasStartedChat(true);
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;
    const message = inputValue.trim();
    setInputValue('');
    await sendMessage(message);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;
    
    const newFiles = Array.from(selectedFiles);
    setFiles(newFiles);
    setShowPhotoError(false);
    
    // Generate previews
    const urls = newFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => {
      prev.forEach(url => URL.revokeObjectURL(url));
      return urls;
    });
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (!formData) {
      toast.error('Please complete the conversation first.');
      return;
    }

    if (files.length === 0) {
      setShowPhotoError(true);
      toast.error('Please upload at least one photo of the issue.');
      return;
    }

    // Use propertyId from formData (extracted by AI) or from URL
    const propertyIdToUse = formData.propertyId || propertyIdFromUrl;
    if (!propertyIdToUse) {
      toast.error('Property not identified. Please mention which property the issue is at.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload files
      const uploadedFiles = await uploadFiles(files);
      if (uploadedFiles.length === 0) {
        throw new Error('Failed to upload photos');
      }

      const attachments = uploadedFiles.map(f => ({
        url: f.url,
        name: f.name,
        type: f.type,
      }));

      if (isPublic) {
        // Public submission via edge function
        const { data, error } = await supabase.functions.invoke('submit-public-maintenance-request', {
          body: {
            propertyId: propertyIdToUse,
            title: formData.issueNature,
            description: formData.explanation,
            location: formData.location,
            submittedBy: formData.submittedBy,
            attemptedFix: formData.attemptedFix,
            issueNature: formData.issueNature,
            explanation: formData.explanation,
            isParticipantRelated: formData.isParticipantRelated || false,
            participantName: formData.participantName || '',
            attachments,
            priority: 'medium',
            category: 'general',
            reportDate: new Date().toISOString().split('T')[0],
            submissionMethod: 'public_ai_assistant'
          },
        });

        if (error) throw error;

        toast.success('Maintenance request submitted successfully!');
        navigate(`/request-submitted?id=${data.requestId}&propertyId=${propertyIdToUse}&public=true`);
      } else {
        // Authenticated submission
        const requestData = {
          propertyId: propertyIdToUse,
          title: formData.issueNature,
          description: formData.explanation,
          location: formData.location,
          site: '',
          submittedBy: formData.submittedBy,
          attemptedFix: formData.attemptedFix,
          issueNature: formData.issueNature,
          explanation: formData.explanation,
          isParticipantRelated: formData.isParticipantRelated || false,
          participantName: formData.participantName || '',
          attachments,
          priority: 'medium' as const,
          category: 'general',
          userId: currentUser?.id || '',
          reportDate: new Date().toISOString().split('T')[0],
          submissionMethod: 'ai_assistant' as const
        };

        const result = await addRequestToProperty(requestData);
        
        if (result) {
          // Send email notifications - matching the regular form behavior
          try {
            const { data: session } = await supabase.auth.getSession();
            const accessToken = session.session?.access_token;
            
            if (accessToken && result.id) {
              console.log('Sending email notifications for chat-submitted request:', result.id);
              const { error: notificationError } = await supabase.functions.invoke('send-maintenance-request-notification', {
                body: { request_id: result.id },
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              });
              
              if (notificationError) {
                console.error('Notification function error:', notificationError);
              }
            }
          } catch (emailError) {
            console.error('Failed to send email notifications:', emailError);
            // Don't block the success flow if email fails
          }
          
          toast.success('Maintenance request submitted successfully!');
          navigate('/requests');
        }
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const collectedFields = formData ? [
    { label: 'Property', value: selectedProperty?.name || formData.propertyId },
    { label: 'Issue', value: formData.issueNature },
    { label: 'Location', value: formData.location },
    { label: 'Reported by', value: formData.submittedBy },
  ].filter(f => f.value) : [];

  // Loading state for public QR flow while property data loads
  if (isPublic && propertyIdFromUrl && (publicLoading || !propertyReady)) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] max-h-[50vh] space-y-4 p-6">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading property information...</p>
      </div>
    );
  }

  // Error state for public flow
  if (isPublic && publicError) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] max-h-[50vh] space-y-4 p-6">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold text-destructive">Unable to load property</h3>
          <p className="text-sm text-muted-foreground">
            {publicError || 'Please try scanning the QR code again.'}
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  // Property selection screen (shown for authenticated users before chat starts)
  if (!hasStartedChat && !isPublic) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] max-h-[50vh] space-y-6 p-6">
        <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Building className="h-8 w-8 text-primary" />
        </div>
        
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Select a Property</h3>
          <p className="text-sm text-muted-foreground">
            Choose the property this maintenance request is for
          </p>
        </div>
        
        <div className="w-full max-w-sm space-y-4">
          <Select value={selectedPropertyId || ''} onValueChange={setSelectedPropertyId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a property..." />
            </SelectTrigger>
            <SelectContent className="bg-background border">
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={handleStartChat} 
            disabled={!selectedPropertyId}
            className="w-full"
          >
            Start Chat
          </Button>
        </div>
        
        {properties.length === 0 && (
          <p className="text-sm text-muted-foreground text-center">
            No properties available. Please add a property first.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] max-h-[70vh]">
      {/* Frustrated assistant popup */}
      <Dialog open={showFrustratedPopup} onOpenChange={dismissFrustratedPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Hello?!?!</DialogTitle>
            <DialogDescription className="text-base pt-2">
              Are you reading the question? I've asked for this information a few times now. 
              Please read my message carefully and provide the information I'm asking for!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={dismissFrustratedPopup}>
              Okay, I'll read more carefully!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Header with collected fields */}
      {collectedFields.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
          {collectedFields.map((field, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {field.label}: {field.value}
            </Badge>
          ))}
        </div>
      )}

      {/* Messages area */}
      <ScrollArea className="flex-1 pr-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <Card className={`max-w-[80%] ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <CardContent className="p-3">
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </CardContent>
              </Card>
              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <Card className="bg-muted">
                <CardContent className="p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </CardContent>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Photo upload section (shown when ready) */}
      {isReady && (
        <div className="mt-4 pt-4 border-t">
          <RequestFormAttachments
            files={files}
            previewUrls={previewUrls}
            onFileChange={handleFileChange}
            onRemoveFile={handleRemoveFile}
            isUploading={isUploading}
            showError={showPhotoError}
          />
          
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                resetChat();
                setHasStartedChat(false);
                setSelectedPropertyId(null);
              }}
              disabled={isSubmitting || isUploading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Start Over
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || isUploading || files.length === 0}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Input area (hidden when ready) */}
      {!isReady && (
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={isLoading || !inputValue.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
