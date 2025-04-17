
export interface Contractor {
  id: string;
  userId: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address?: string;
  specialties?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Quote {
  id: string;
  requestId: string;
  contractorId: string;
  amount: number;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
