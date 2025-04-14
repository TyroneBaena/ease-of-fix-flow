
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
  title: string;
  description: string;
  category: string;
  location: string;
  priority: string;
  status: string;
  propertyId?: string; 
  createdAt: string;
  updatedAt?: string; 
  dueDate?: string;
  assignedTo?: string;
  attachments?: Array<{ url: string }>;
  history?: Array<{ action: string; timestamp: string }>;
}
