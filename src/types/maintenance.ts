
export interface MaintenanceRequest {
  id: string;
  title: string;  
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'open';
  location: string; 
  priority?: 'low' | 'medium' | 'high';
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
  attachments?: Array<{ url: string }> | null;
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
  // Added field to match backend
  userId: string;
  // For backward compatibility
  user_id?: string;
}
