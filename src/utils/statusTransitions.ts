import { supabase } from '@/lib/supabase';

/**
 * Automatically transition a maintenance request status to 'in-progress'
 * when an admin or manager takes action on it.
 * 
 * Only transitions from 'pending' or 'open' status.
 */
export const autoTransitionToInProgress = async (
  requestId: string,
  currentStatus: string,
  actorRole: string
): Promise<boolean> => {
  // Only transition if current status is 'pending' or 'open'
  if (currentStatus !== 'pending' && currentStatus !== 'open') {
    console.log('autoTransitionToInProgress: Status is not pending/open, skipping');
    return false;
  }
  
  // Only admin and manager actions trigger this
  if (actorRole !== 'admin' && actorRole !== 'manager') {
    console.log('autoTransitionToInProgress: Actor is not admin/manager, skipping');
    return false;
  }

  try {
    console.log('autoTransitionToInProgress: Transitioning request', requestId, 'to in-progress');
    
    const { error } = await supabase
      .from('maintenance_requests')
      .update({ 
        status: 'in-progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) {
      console.error('autoTransitionToInProgress: Failed to transition status:', error);
      return false;
    }
    
    console.log('autoTransitionToInProgress: Successfully transitioned to in-progress');
    return true;
  } catch (error) {
    console.error('autoTransitionToInProgress: Error:', error);
    return false;
  }
};

/**
 * Update the priority of a maintenance request
 */
export const updateRequestPriority = async (
  requestId: string,
  priority: 'low' | 'medium' | 'high' | 'critical'
): Promise<boolean> => {
  try {
    console.log('updateRequestPriority: Updating request', requestId, 'to priority', priority);
    
    const { error } = await supabase
      .from('maintenance_requests')
      .update({ 
        priority,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) {
      console.error('updateRequestPriority: Failed to update priority:', error);
      return false;
    }
    
    console.log('updateRequestPriority: Successfully updated priority');
    return true;
  } catch (error) {
    console.error('updateRequestPriority: Error:', error);
    return false;
  }
};
