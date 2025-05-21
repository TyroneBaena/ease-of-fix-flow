
import { Contractor } from '@/types/contractor';
import { IncludeInfo } from './operations/quoteOperations';

export interface ContractorContextType {
  contractors: Contractor[];
  loading: boolean;
  error: Error | null;
  loadContractors: () => Promise<void>;
  assignContractor: (requestId: string, contractorId: string) => Promise<boolean | void>;
  changeAssignment: (requestId: string, contractorId: string) => Promise<boolean | void>;
  requestQuote: (requestId: string, contractorId: string, includeInfo: IncludeInfo, notes: string) => Promise<boolean | void>;
  submitQuote: (requestId: string, amount: number, description?: string) => Promise<boolean | void>;
  approveQuote: (quoteId: string) => Promise<boolean | void>;
  rejectQuote: (quoteId: string) => Promise<boolean | void>;
  updateJobProgress: (
    requestId: string, 
    progress: number, 
    notes?: string, 
    completionPhotos?: Array<{ url: string }>
  ) => Promise<boolean | void>;
}
