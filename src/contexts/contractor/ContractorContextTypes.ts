
import { Contractor, Quote } from '@/types/contractor';
import { MaintenanceRequest } from '@/types/maintenance';

export interface ContractorContextType {
  // From the contractor dashboard perspective
  activeJobs?: MaintenanceRequest[];
  completedJobs?: MaintenanceRequest[];
  contractorId?: string | null;
  fetchJobs?: () => Promise<void>;
  
  // Shared context properties used across components
  contractors: Contractor[];
  loading: boolean;
  error: Error | null;
  loadContractors: () => Promise<void>;
  
  // Assignment operations
  assignContractor: (requestId: string, contractorId: string) => Promise<void>;
  changeAssignment: (requestId: string, contractorId: string) => Promise<void>;
  
  // Quote operations
  requestQuote: (requestId: string, contractorId: string, includeInfo?: object, notes?: string) => Promise<void>;
  submitQuote: (jobId: string, amount: number, description?: string) => Promise<void>;
  approveQuote: (quoteId: string) => Promise<void>;
  rejectQuote: (quoteId: string) => Promise<void>;
  
  // Progress operations
  updateJobProgress: (
    jobId: string,
    progress: number,
    notes?: string,
    completionPhotos?: Array<{ url: string }>
  ) => Promise<void>;
  
  // For backward compatibility 
  markJobComplete?: (jobId: string) => Promise<boolean>;
}
