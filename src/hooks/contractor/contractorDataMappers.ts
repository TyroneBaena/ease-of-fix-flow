
import { MaintenanceRequest } from '@/types/maintenance';

// Helper function to map database objects to MaintenanceRequest type
export const mapRequestFromDb = (job: any): MaintenanceRequest => ({
  id: job.id,
  title: job.title || job.issue_nature || 'Untitled request',
  description: job.description || job.explanation || '',
  status: job.status as 'pending' | 'in-progress' | 'completed' | 'open',
  location: job.location || '',
  priority: job.priority as 'low' | 'medium' | 'high',
  site: job.site || job.category || '',
  submittedBy: job.submitted_by || 'Unknown',
  date: job.created_at,
  propertyId: job.property_id,
  contactNumber: job.contact_number,
  address: job.address,
  practiceLeader: job.practice_leader,
  practiceLeaderPhone: job.practice_leader_phone,
  attachments: job.attachments ? (Array.isArray(job.attachments) ? job.attachments : []) : [],
  category: job.category,
  createdAt: job.created_at,
  updatedAt: job.updated_at,
  dueDate: job.due_date,
  assignedTo: job.assigned_to,
  history: job.history ? (Array.isArray(job.history) ? job.history : []) : [],
  isParticipantRelated: job.is_participant_related || false,
  participantName: job.participant_name || 'N/A',
  attemptedFix: job.attempted_fix || '',
  issueNature: job.issue_nature || '',
  explanation: job.explanation || '',
  reportDate: job.report_date || '',
  contractorId: job.contractor_id,
  assignedAt: job.assigned_at,
  completionPercentage: job.completion_percentage || 0,
  completionPhotos: job.completion_photos ? (Array.isArray(job.completion_photos) ? job.completion_photos : []) : [],
  progressNotes: job.progress_notes ? (Array.isArray(job.progress_notes) ? job.progress_notes : []) : [],
  quoteRequested: job.quote_requested || false,
  quotedAmount: job.quoted_amount,
  userId: job.user_id || 'unknown-user'
});

// Helper function to map quote objects to MaintenanceRequest type
export const mapRequestFromQuote = (quote: any): MaintenanceRequest => {
  const request = quote.maintenance_requests;
  return {
    id: request.id,
    title: request.title || request.issue_nature || 'Untitled request',
    description: request.description || request.explanation || '',
    status: request.status as 'pending' | 'in-progress' | 'completed' | 'open',
    location: request.location || '',
    priority: request.priority as 'low' | 'medium' | 'high',
    site: request.site || request.category || '',
    submittedBy: request.submitted_by || 'Unknown',
    quote: {
      id: quote.id,
      amount: quote.amount,
      status: quote.status,
      description: quote.description,
      submittedAt: quote.submitted_at
    },
    date: request.created_at,
    propertyId: request.property_id,
    contactNumber: request.contact_number,
    address: request.address,
    practiceLeader: request.practice_leader,
    practiceLeaderPhone: request.practice_leader_phone,
    attachments: request.attachments ? (Array.isArray(request.attachments) ? request.attachments : []) : [],
    category: request.category,
    createdAt: request.created_at,
    updatedAt: request.updated_at,
    dueDate: request.due_date,
    assignedTo: request.assigned_to,
    history: request.history ? (Array.isArray(request.history) ? request.history : []) : [],
    isParticipantRelated: request.is_participant_related || false,
    participantName: request.participant_name || 'N/A',
    attemptedFix: request.attempted_fix || '',
    issueNature: request.issue_nature || '',
    explanation: request.explanation || '',
    reportDate: request.report_date || '',
    contractorId: request.contractor_id,
    assignedAt: request.assigned_at,
    completionPercentage: request.completion_percentage || 0,
    completionPhotos: request.completion_photos ? (Array.isArray(request.completion_photos) ? request.completion_photos : []) : [],
    progressNotes: request.progress_notes ? (Array.isArray(request.progress_notes) ? request.progress_notes : []) : [],
    quoteRequested: request.quote_requested || false,
    quotedAmount: request.quoted_amount,
    userId: request.user_id || 'unknown-user'
  };
};
