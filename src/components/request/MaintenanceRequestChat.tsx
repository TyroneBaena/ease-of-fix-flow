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
import { usePublicPropertyContext } from '@/contexts/property/PublicPropertyProvider';
import { useMaintenanceRequestContext } from '@/contexts/maintenance/MaintenanceRequestContext';
import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface MaintenanceRequestChatProps {
  propertyId?: string;
  isPublic?: boolean;
}

export const MaintenanceRequestChat: React.FC<MaintenanceRequestChatProps> = ({ 
  propertyId: propPropertyId,
  isPublic = false 
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propertyIdFromUrl = propPropertyId || searchParams.get('propertyId');
  
  // Property selection state
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(propertyIdFromUrl || '');
  
  // Get properties based on public/private context
  const privatePropertyContext = usePropertyContext();
  const publicPropertyContext = usePublicPropertyContext();
  const properties = isPublic ? publicPropertyContext.properties : privatePropertyContext.properties;
  
  const { messages, isLoading, isReady, formData, sendMessage, resetChat, initializeChat } = useMaintenanceChat();
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

  // The effective property ID (from URL/prop or user selection)
  const effectivePropertyId = propertyIdFromUrl || selectedPropertyId;
  const selectedProperty = properties.find(p => p.id === effectivePropertyId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize chat with AI greeting only when property is selected
  useEffect(() => {
    if (effectivePropertyId && messages.length === 0) {
      initializeChat();
    }
  }, [effectivePropertyId, messages.length, initializeChat]);

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

    if (!effectivePropertyId) {
      toast.error('Property not selected. Please try again.');
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
            propertyId: effectivePropertyId,
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
          },
        });

        if (error) throw error;

        toast.success('Maintenance request submitted successfully!');
        navigate(`/request-submitted?id=${data.id}&public=true`);
      } else {
        // Authenticated submission
        const requestData = {
          propertyId: effectivePropertyId,
          title: formData.issueNature,
          description: formData.explanation,
          location: formData.location,
          site: formData.location,
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
        };

        const result = await addRequestToProperty(requestData);
        
        if (result) {
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
    { label: 'Issue', value: formData.issueNature },
    { label: 'Location', value: formData.location },
    { label: 'Reported by', value: formData.submittedBy },
  ] : [];

  // Property selector UI if no property is selected
  if (!effectivePropertyId) {
    return (
      <div className="flex flex-col h-[600px] max-h-[70vh]">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-full max-w-md space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Building className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Select a Property</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Choose the property where the maintenance issue is located
              </p>
            </div>
            
            {properties.length === 0 ? (
              <div className="p-4 border rounded-md bg-amber-50 text-amber-800">
                <div className="flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  <p className="font-medium">No properties available</p>
                </div>
                <p className="mt-1 text-sm">
                  You need to add properties first before creating maintenance requests.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="property-select">Property</Label>
                <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                  <SelectTrigger id="property-select">
                    <SelectValue placeholder="Select property..." />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] max-h-[70vh]">
      {/* Header with selected property and collected fields */}
      <div className="flex flex-wrap gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
        <Badge variant="outline" className="text-xs">
          <Building className="h-3 w-3 mr-1" />
          {selectedProperty?.name || 'Property'}
        </Badge>
        {collectedFields.map((field, i) => (
          <Badge key={i} variant="secondary" className="text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {field.label}: {field.value}
          </Badge>
        ))}
      </div>

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
              onClick={resetChat}
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
