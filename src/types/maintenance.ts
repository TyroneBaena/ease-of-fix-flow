
export interface MaintenanceRequest {
  id: string;
  title: string;  // Changed from optional to required
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'open';
  location: string; // Changed from optional to required
  priority?: 'low' | 'medium' | 'high';
  site?: string;
  submittedBy?: string;
  quote?: string;
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
}
