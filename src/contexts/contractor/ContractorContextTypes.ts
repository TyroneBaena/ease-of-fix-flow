
import { Contractor, Quote } from '@/types/contractor';

export interface ContractorContextType {
  contractors: Contractor[];
  loading: boolean;
  error: Error | null;
  assignContractor: (requestId: string, contractorId: string) => Promise<void>;
  requestQuote: (requestId: string, amount: number, description?: string) => Promise<void>;
  submitQuote: (requestId: string, amount: number, description?: string) => Promise<void>;
  approveQuote: (quoteId: string) => Promise<void>;
  updateJobProgress: (requestId: string, progress: number, notes?: string) => Promise<void>;
}
