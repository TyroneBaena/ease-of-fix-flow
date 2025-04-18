
import { supabase } from '@/lib/supabase';
import { Contractor } from '@/types/contractor';
import { toast } from '@/lib/toast';

export const assignContractorToRequest = async (requestId: string, contractorId: string) => {
  const { error } = await supabase
    .from('maintenance_requests')
    .update({
      contractor_id: contractorId,
      assigned_at: new Date().toISOString(),
      status: 'in-progress'
    })
    .eq('id', requestId);

  if (error) throw error;
};

export const requestQuoteForJob = async (requestId: string, contractorId: string) => {
  const { error } = await supabase
    .from('maintenance_requests')
    .update({
      quote_requested: true
    })
    .eq('id', requestId);

  if (error) throw error;
};

