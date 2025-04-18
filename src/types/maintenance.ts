
export interface MaintenanceRequest {
  id: string;
  title?: string;  // Made optional to match property.ts
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'open'; // Added 'open' for Dashboard.tsx
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
  attachments?: Array<{ url: string }> | null;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
  dueDate?: string;
  assignedTo?: string;
  history?: Array<{ action: string; timestamp: string }> | null;
  isParticipantRelated?: boolean;
  participantName?: string;
  attemptedFix?: string;
  issueNature?: string;
  explanation?: string;
  reportDate?: string;
}
