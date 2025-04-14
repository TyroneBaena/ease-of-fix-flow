
export interface Property {
  id: string;
  name: string;
  address: string;
  contactNumber: string;
  email: string;
  practiceLeader: string;
  practiceLeaderEmail: string;
  practiceLeaderPhone: string;
  renewalDate: string;
  rentAmount: number;
  createdAt: string;
}

export interface MaintenanceRequest {
  id: string;
  // New fields for the updated form
  isParticipantRelated: boolean;
  participantName: string;
  attemptedFix: string;
  issueNature: string;
  explanation: string;
  location: string;
  reportDate: string;
  site: string;
  submittedBy: string;
  status: string;
  // Original fields needed for backward compatibility
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  propertyId?: string; 
  createdAt: string;
  updatedAt?: string; 
  assignedTo?: string;
  dueDate?: string;
  attachments?: Array<{ url: string }> | null;
  history?: Array<{ action: string; timestamp: string }> | null;
}

// Type guard to check if value is an array of attachment objects
export function isAttachmentArray(value: any): value is Array<{ url: string }> {
  return Array.isArray(value) && 
         value.every(item => typeof item === 'object' && item !== null && 'url' in item);
}

// Type guard to check if value is an array of history objects
export function isHistoryArray(value: any): value is Array<{ action: string; timestamp: string }> {
  return Array.isArray(value) && 
         value.every(item => typeof item === 'object' && item !== null && 
                    'action' in item && 'timestamp' in item);
}
