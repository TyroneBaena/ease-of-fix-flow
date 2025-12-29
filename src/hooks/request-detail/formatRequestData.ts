
import { MaintenanceRequest } from '@/types/maintenance';

/**
 * Converts a database request object to our frontend MaintenanceRequest type
 */
export function formatRequestData(data: any): MaintenanceRequest {
  console.log('formatRequestData - START - raw data:', data);
  console.log('formatRequestData - raw attachments field:', data.attachments);
  console.log('formatRequestData - attachments type:', typeof data.attachments);
  console.log('formatRequestData - attachments value:', JSON.stringify(data.attachments));
  
  // Function to process attachments from various formats
  const processAttachments = (attachments: any) => {
    console.log('processAttachments - input:', attachments);
    console.log('processAttachments - input type:', typeof attachments);
    
    if (!attachments) {
      console.log('processAttachments - No attachments found (null/undefined)');
      return null;
    }
    
    // If it's a string, try to parse it as JSON
    if (typeof attachments === 'string') {
      console.log('processAttachments - Processing string attachments:', attachments);
      try {
        const parsed = JSON.parse(attachments);
        console.log('processAttachments - Parsed from string:', parsed);
        if (Array.isArray(parsed)) {
          const processedArray = parsed.map((att: any) => ({
            url: att.url,
            name: att.name || undefined,
            type: att.type || undefined
          }));
          console.log('processAttachments - Processed array from string:', processedArray);
          return processedArray;
        }
        return null;
      } catch (e) {
        console.error('processAttachments - Failed to parse attachments string:', e);
        return null;
      }
    }
    
    // If it's already an array
    if (Array.isArray(attachments)) {
      console.log('processAttachments - Processing array attachments:', attachments);
      const processedArray = attachments.map((att: any) => {
        console.log('processAttachments - processing individual attachment:', att);
        return {
          url: att.url,
          name: att.name || undefined,
          type: att.type || undefined
        };
      });
      console.log('processAttachments - Final processed array:', processedArray);
      return processedArray;
    }
    
    // If it's an object (JSONB from database)
    if (typeof attachments === 'object' && attachments !== null) {
      console.log('processAttachments - Processing object attachments:', attachments);
      // Check if it's a JSONB array that looks like an object
      if (attachments.length !== undefined || Array.isArray(attachments)) {
        console.log('processAttachments - Object appears to be array-like');
        const arrayData = Array.isArray(attachments) ? attachments : Object.values(attachments);
        const processedArray = arrayData.map((att: any) => ({
          url: att.url,
          name: att.name || undefined,
          type: att.type || undefined
        }));
        console.log('processAttachments - Processed object as array:', processedArray);
        return processedArray;
      }
      
      // Single attachment object
      if (attachments.url) {
        console.log('processAttachments - Processing single attachment object');
        const singleAttachment = [{
          url: attachments.url,
          name: attachments.name || undefined,
          type: attachments.type || undefined
        }];
        console.log('processAttachments - Single attachment result:', singleAttachment);
        return singleAttachment;
      }
    }
    
    console.log('processAttachments - Unknown attachments format, returning null');
    return null;
  };
  
  // Process the attachments
  const processedAttachments = processAttachments(data.attachments);
  console.log('formatRequestData - FINAL processed attachments:', processedAttachments);
  
  // Convert snake_case to camelCase where needed
  const formattedRequest: MaintenanceRequest = {
    id: data.id,
    title: data.title || data.issue_nature || 'Untitled Request',
    description: data.description || '',
    status: data.status as 'pending' | 'in-progress' | 'completed' | 'open',
    location: data.location,
    priority: data.priority as 'low' | 'medium' | 'high' | undefined,
    site: data.site || data.category || 'Unknown',
    submittedBy: data.submitted_by || 'Anonymous',
    propertyId: data.property_id,
    contactNumber: '',
    address: '',
    attachments: processedAttachments,
    category: data.category,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    dueDate: data.due_date,
    assignedTo: data.assigned_to,
    history: data.history ? 
      (Array.isArray(data.history) ? 
        data.history as { action: string; timestamp: string }[] : 
        []) : 
      null,
    isParticipantRelated: data.is_participant_related || false,
    participantName: data.participant_name || 'N/A',
    attemptedFix: data.attempted_fix || '',
    issueNature: data.issue_nature || '',
    explanation: data.explanation || '',
    reportDate: data.report_date || '',
    contractorId: data.contractor_id,
    assignedAt: data.assigned_at,
    completionPercentage: data.completion_percentage,
    completionPhotos: data.completion_photos ? 
      (Array.isArray(data.completion_photos) ? 
        data.completion_photos as { url: string }[] : 
        []) : 
      null,
    quoteRequested: data.quote_requested,
    quotedAmount: data.quoted_amount,
    progressNotes: data.progress_notes,
    // Landlord assignment
    assigned_to_landlord: data.assigned_to_landlord ?? false,
    landlord_assigned_at: data.landlord_assigned_at || null,
    landlord_assigned_by: data.landlord_assigned_by || null,
    landlord_notes: data.landlord_notes || null,
    userId: data.user_id || 'unknown-user',
    // AI Responsibility Suggestion
    aiResponsibilitySuggestion: data.ai_responsibility_suggestion || null,
    aiResponsibilityUrgency: data.ai_responsibility_urgency || null,
    aiResponsibilityAssetType: data.ai_responsibility_asset_type || null,
    aiResponsibilityReasoning: data.ai_responsibility_reasoning || null,
    aiResponsibilityConfidence: data.ai_responsibility_confidence || null,
    aiResponsibilityAnalyzedAt: data.ai_responsibility_analyzed_at || null,
  };

  console.log('formatRequestData - FINAL formatted request attachments:', formattedRequest.attachments);
  console.log('formatRequestData - COMPLETE formatted request:', formattedRequest);
  return formattedRequest;
}
