
export interface MaintenanceRequest {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed';
  quote: string;
  date: string;
  description?: string;
  location?: string;
  priority?: 'low' | 'medium' | 'high';
  site?: string;
  submittedBy?: string;
  contactNumber?: string;
  address?: string;
  practiceLeader?: string;
  practiceLeaderPhone?: string;
  attachments?: Array<{ url: string }>;
}
