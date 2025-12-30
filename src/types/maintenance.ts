
export interface MaintenanceRequest {
  id: string;
  title: string;  
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'open' | 'requested' | 'cancelled';
  location: string; 
  priority?: 'low' | 'medium' | 'high' | 'critical';
  site: string;  
  submittedBy: string;  
  quote?: {
    id: string;
    amount: number;
    status: string;
    description?: string;
    submittedAt?: string;
  } | string;
  date?: string;
  propertyId?: string;
  contactNumber?: string;
  address?: string;
  practiceLeader?: string;
  practiceLeaderPhone?: string;
  practiceLeaderEmail?: string;
  attachments?: Array<{ url: string; name?: string; type?: string }> | null;
  category?: string;
  createdAt: string;
  updatedAt?: string;
  dueDate?: string;
  assignedTo?: string;
  history?: Array<{ action: string; timestamp: string }> | null;
  isParticipantRelated: boolean;
  participantName: string;
  attemptedFix: string;
  issueNature: string;
  explanation: string;
  reportDate: string;
  // Additional fields for contractor functionality
  contractorId?: string;
  assignedAt?: string;
  completionPercentage?: number;
  completionPhotos?: Array<{ url: string }> | null;
  progressNotes?: Array<{ note: string; timestamp: string }> | string[];
  quoteRequested?: boolean;
  quotedAmount?: number;
  quotes?: any[];
  // Invoice functionality
  invoice_id?: string;
  // Landlord assignment fields
  assigned_to_landlord?: boolean;
  landlord_assigned_at?: string | null;
  landlord_assigned_by?: string | null;
  landlord_notes?: string | null;
  // User ID field (required)
  userId: string;
  // For backward compatibility
  user_id?: string;
  // Property info for display
  propertyAddress?: string;
  propertyName?: string;
  // AI Responsibility Suggestion
  aiResponsibilitySuggestion?: string | null;
  aiResponsibilityUrgency?: string | null;
  aiResponsibilityAssetType?: string | null;
  aiResponsibilityReasoning?: string | null;
  aiResponsibilityConfidence?: string | null;
  aiResponsibilityAnalyzedAt?: string | null;
  // Submission method tracking
  submissionMethod?: 'form' | 'ai_assistant' | 'public_form' | 'public_ai_assistant';
}
