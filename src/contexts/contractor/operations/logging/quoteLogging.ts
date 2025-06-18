
import { supabase } from '@/lib/supabase';

// Helper function to create quote logs
export const createQuoteLog = async (
  quoteId: string,
  contractorId: string,
  action: 'created' | 'updated' | 'resubmitted' | 'quote_requested' | 'rejected',
  oldAmount?: number,
  newAmount?: number,
  oldDescription?: string,
  newDescription?: string
) => {
  const { error } = await supabase
    .from('quote_logs')
    .insert({
      quote_id: quoteId,
      contractor_id: contractorId,
      action,
      old_amount: oldAmount,
      new_amount: newAmount,
      old_description: oldDescription,
      new_description: newDescription
    });

  if (error) {
    console.error('Error creating quote log:', error);
    // Don't throw here - logging failure shouldn't fail the main operation
  }
};
