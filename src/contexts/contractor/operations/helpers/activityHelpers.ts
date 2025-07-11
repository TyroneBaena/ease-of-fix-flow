
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
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        request_id: data.requestId,
        action_type: data.actionType,
        description: data.description,
        actor_name: data.actorName,
        actor_role: data.actorRole,
        metadata: data.metadata
      });

    if (error) {
      console.error('Error logging activity:', error);
      throw error;
    }

    console.log(`Activity logged: ${data.actionType} for request ${data.requestId}`);
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw here to prevent breaking the main operation
  }
};
