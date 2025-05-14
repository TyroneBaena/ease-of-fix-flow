
import { MaintenanceRequest } from '@/types/maintenance';

export interface ContractorContextType {
  activeJobs: MaintenanceRequest[];
  completedJobs: MaintenanceRequest[];
  loading: boolean;
  error: string | null;
  contractorId: string | null;
  fetchJobs: () => Promise<void>;
  updateJobProgress: (
    jobId: string,
    progress: number,
    notes: string
  ) => Promise<boolean>;
  markJobComplete: (jobId: string) => Promise<boolean>;
  submitQuote: (
    jobId: string, 
    amount: number, 
    description: string
  ) => Promise<boolean>;
}
