
import { Contractor, Quote } from '@/types/contractor';

export interface ContractorContextType {
  contractors: Contractor[];
  loading: boolean;
  error: Error | null;
  loadContractors: () => Promise<void>;
  assignContractor: (requestId: string, contractorId: string) => Promise<void>;
  changeAssignment: (requestId: string, contractorId: string) => Promise<void>;
  requestQuote: (requestId: string, contractorId: string, includeInfo?: any, notes?: string) => Promise<void>;
  submitQuote: (requestId: string, amount: number, description?: string) => Promise<void>;
  approveQuote: (quoteId: string) => Promise<void>;
  rejectQuote: (quoteId: string) => Promise<void>;
  updateJobProgress: (requestId: string, progress: number, notes?: string, completionPhotos?: Array<{ url: string }>) => Promise<void>;
}
