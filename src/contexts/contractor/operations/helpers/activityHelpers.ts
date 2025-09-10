
import { supabase } from '@/lib/supabase';

export interface ActivityLogData {
  requestId: string;
  actionType: string;
  description: string;
  actorName?: string;
  actorRole?: string;
  metadata?: Record<string, any>;
}

export const logActivity = async (data: ActivityLogData) => {
  try {
    console.log('🔥 logActivity - NEW VERSION - Attempting to log activity:', data);
    console.log('🔥 Using RPC function insert_activity_log_secure');
    
    // Use the secure database function that bypasses RLS
    const { data: result, error } = await supabase.rpc('insert_activity_log_secure', {
      p_request_id: data.requestId,
      p_action_type: data.actionType,
      p_description: data.description,
      p_actor_name: data.actorName || null,
      p_actor_role: data.actorRole || null,
      p_metadata: data.metadata || null
    });

    if (error) {
      console.error('logActivity - Error logging activity:', error);
      console.error('logActivity - Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log(`logActivity - Activity logged successfully with ID:`, result);
    console.log(`logActivity - Activity logged: ${data.actionType} for request ${data.requestId}`);
  } catch (error) {
    console.error('logActivity - Failed to log activity:', error);
    // Don't throw here to prevent breaking the main operation
  }
};

