
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Contractor } from '@/types/contractor';

// Add a debounce mechanism for toasts
let lastToastTime = 0;
const TOAST_DEBOUNCE_MS = 5000; // Increased to 5 seconds between toasts

export const updateContractor = async (contractor: Contractor, updates: Partial<Contractor>) => {
  try {
    const now = Date.now();
    
    const { error } = await supabase
      .from('contractors')
      .update({
        company_name: updates.companyName,
        contact_name: updates.contactName,
        email: updates.email,
        phone: updates.phone,
        address: updates.address || null,
        specialties: updates.specialties || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', contractor.id);
      
    if (error) throw error;
    
    // Strongly debounce success toast messages to prevent duplicates
    if (now - lastToastTime > TOAST_DEBOUNCE_MS) {
      lastToastTime = now;
      toast.success('Contractor updated successfully');
    } else {
      console.log('Toast suppressed due to debouncing, last toast was', now - lastToastTime, 'ms ago');
    }
    
    return true;
  } catch (error) {
    console.error('Error updating contractor:', error);
    toast.error('Failed to update contractor');
    return false;
  }
};
