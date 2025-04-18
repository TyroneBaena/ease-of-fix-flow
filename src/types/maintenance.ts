
export interface MaintenanceRequest {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed';
  location?: string;
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
  attachments?: Array<{ url: string }>;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
  dueDate?: string;
  assignedTo?: string;
  history?: Array<{ action: string; timestamp: string }>;
  isParticipantRelated?: boolean;
  participantName?: string;
  attemptedFix?: string;
  issueNature?: string;
  explanation?: string;
  reportDate?: string;
}
