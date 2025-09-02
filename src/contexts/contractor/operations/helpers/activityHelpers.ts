
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
    console.log('logActivity - Attempting to log activity:', data);
    
    const activityRecord = {
      request_id: data.requestId,
      action_type: data.actionType,
      description: data.description,
      actor_name: data.actorName,
      actor_role: data.actorRole,
      metadata: data.metadata,
      // Temporary dummy value - will be set by trigger
      organization_id: '00000000-0000-0000-0000-000000000000'
    };

    console.log('logActivity - Activity record to insert:', activityRecord);

    const { data: insertedData, error } = await supabase
      .from('activity_logs')
      .insert(activityRecord)
      .select('*');

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

    console.log(`logActivity - Activity logged successfully:`, insertedData);
    console.log(`logActivity - Activity logged: ${data.actionType} for request ${data.requestId}`);
  } catch (error) {
    console.error('logActivity - Failed to log activity:', error);
    // Don't throw here to prevent breaking the main operation
  }
};
