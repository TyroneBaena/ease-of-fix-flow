
import { MaintenanceRequest } from '@/types/maintenance';

/**
 * Converts a database request object to our frontend MaintenanceRequest type
 */
export function formatRequestData(data: any): MaintenanceRequest {
  console.log('formatRequestData - raw data:', data);
  console.log('formatRequestData - raw attachments:', data.attachments);
  
  // Convert snake_case to camelCase where needed
  const formattedRequest: MaintenanceRequest = {
    id: data.id,
    title: data.title || data.issue_nature || 'Untitled Request',
    description: data.description || '',
    // Use type assertion to ensure status is one of the allowed values
    status: data.status as 'pending' | 'in-progress' | 'completed' | 'open',
    location: data.location,
    priority: data.priority as 'low' | 'medium' | 'high' | undefined,
    site: data.site || data.category || 'Unknown',
    submittedBy: data.submitted_by || 'Anonymous',
    propertyId: data.property_id,
    // These fields may not exist in the database response, so use empty string as default
    contactNumber: '',  // Default fallback value since it's missing from DB
    address: '',        // Default fallback value since it's missing from DB
    // Handle JSON fields with proper type casting for attachments
    attachments: data.attachments ? 
      (Array.isArray(data.attachments) ? 
        data.attachments.map((att: any) => {
          console.log('formatRequestData - processing attachment:', att);
          return {
            url: att.url,
            name: att.name || undefined,
            type: att.type || undefined
          };
        }) : 
        []) : 
      null,
    category: data.category,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    dueDate: data.due_date,
    assignedTo: data.assigned_to,
    // Handle JSON fields with proper type casting
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
    // Handle JSON fields with proper type casting
    completionPhotos: data.completion_photos ? 
      (Array.isArray(data.completion_photos) ? 
        data.completion_photos as { url: string }[] : 
        []) : 
      null,
    quoteRequested: data.quote_requested,
    quotedAmount: data.quoted_amount,
    progressNotes: data.progress_notes,
    userId: data.user_id || 'unknown-user'
  };

  console.log('formatRequestData - formatted attachments:', formattedRequest.attachments);
  return formattedRequest;
}
