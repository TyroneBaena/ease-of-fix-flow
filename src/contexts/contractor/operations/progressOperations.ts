
import { supabase } from '@/lib/supabase';

import { logActivity } from './helpers/activityHelpers';

export const updateJobProgressStatus = async (
  requestId: string, 
  progress: number, 
  notes?: string,
  completionPhotos?: Array<{ url: string }>,
  action?: 'complete' | 'reopen' | 'cancel'
) => {
  console.log(`🚀 updateJobProgressStatus - STARTING UPDATE for request ${requestId}`);
  console.log(`🚀 updateJobProgressStatus - Progress: ${progress}%`);
  console.log(`🚀 updateJobProgressStatus - Notes:`, notes);
  console.log(`🚀 updateJobProgressStatus - Completion photos:`, completionPhotos);
  
  // First, let's check current status in database
  const { data: currentData } = await supabase
    .from('maintenance_requests')
    .select('id, status, completion_percentage')
    .eq('id', requestId)
    .single();
  
  console.log(`🚀 BEFORE UPDATE - Current status: ${currentData?.status}, Current progress: ${currentData?.completion_percentage}%`);

  const updates: any = {
    completion_percentage: progress
  };

  if (notes) {
    const { data: currentRequest } = await supabase
      .from('maintenance_requests')
      .select('progress_notes')
      .eq('id', requestId)
      .single();

    updates.progress_notes = [
      ...(currentRequest?.progress_notes || []),
      notes
    ];
  }

  if (completionPhotos && completionPhotos.length > 0) {
    updates.completion_photos = completionPhotos;
  }

  // Update status based on progress and action - simplified logic
  console.log(`updateJobProgressStatus - Determining status update for progress: ${progress}%, action: ${action}`);
  
  if (action === 'cancel') {
    console.log('updateJobProgressStatus - Setting status to cancelled');
    updates.status = 'cancelled';
  } else if (progress === 100) {
    console.log('updateJobProgressStatus - Setting status to completed');
    updates.status = 'completed';
  } else if (progress > 0) {
    // Always set to in-progress if there's any progress > 0
    console.log('updateJobProgressStatus - Progress > 0, setting status to in-progress');
    updates.status = 'in-progress';
  } else {
    console.log('updateJobProgressStatus - Progress is 0, not updating status');
  }

  console.log(`updateJobProgressStatus - Database updates:`, updates);

  console.log(`updateJobProgressStatus - Attempting database update with requestId: ${requestId}`);
  console.log(`updateJobProgressStatus - Update object:`, JSON.stringify(updates, null, 2));
  
  const { data, error } = await supabase
    .from('maintenance_requests')
    .update(updates)
    .eq('id', requestId)
    .select('*');
    
  console.log(`updateJobProgressStatus - Database response data:`, data);
  console.log(`updateJobProgressStatus - Database response error:`, error);

  if (error) {
    console.error('updateJobProgressStatus - Database update error:', error);
    throw error;
  }

  console.log(`🚀 updateJobProgressStatus - Database update successful:`, data);
  console.log(`🚀 AFTER UPDATE - New status: ${data?.[0]?.status}, New progress: ${data?.[0]?.completion_percentage}%`);
  
  // Verify the update took effect by fetching again
  const { data: verifyData } = await supabase
    .from('maintenance_requests')
    .select('id, status, completion_percentage')
    .eq('id', requestId)
    .single();
  
  console.log(`🚀 VERIFICATION - Actual status in DB: ${verifyData?.status}, Actual progress: ${verifyData?.completion_percentage}%`);

  // Get contractor information for activity logging
  console.log('updateJobProgressStatus - Getting contractor information for activity logging');
  const { data: userData } = await supabase.auth.getUser();
  console.log('updateJobProgressStatus - Current user:', userData.user?.id);
  
  const { data: contractorData, error: contractorError } = await supabase
    .from('contractors')
    .select('contact_name')
    .eq('user_id', userData.user?.id)
    .single();

  if (contractorError) {
    console.error('updateJobProgressStatus - Error fetching contractor data:', contractorError);
  }
  console.log('updateJobProgressStatus - Contractor data:', contractorData);

  // Log activity based on progress
  console.log('updateJobProgressStatus - Logging activity for progress:', progress);
  if (progress === 100) {
    console.log('updateJobProgressStatus - Logging job completion activity');
    await logActivity({
      requestId,
      actionType: 'job_completed',
      description: `Job marked as completed with ${completionPhotos?.length || 0} completion photos`,
      actorName: contractorData?.contact_name || 'Unknown Contractor',
      actorRole: 'contractor',
      metadata: {
        progress_percentage: progress,
        completion_photos_count: completionPhotos?.length || 0,
        completion_photos: completionPhotos,
        notes: notes
      }
    });

    // Send email notification for job completion
    console.log('updateJobProgressStatus - Sending job completion notification');
    await sendJobCompletionNotification(requestId, contractorData?.contact_name || 'Unknown Contractor', completionPhotos);
  } else {
    console.log('updateJobProgressStatus - Logging progress update activity');
    await logActivity({
      requestId,
      actionType: 'progress_updated',
      description: `Progress updated to ${progress}%${notes ? ` with notes: ${notes}` : ''}`,
      actorName: contractorData?.contact_name || 'Unknown Contractor',
      actorRole: 'contractor',
      metadata: {
        progress_percentage: progress,
        notes: notes,
        photos_uploaded: completionPhotos?.length || 0
      }
    });
  }

  console.log('updateJobProgressStatus - Operation completed successfully');
};

const sendJobCompletionNotification = async (
  requestId: string, 
  contractorName: string, 
  completionPhotos?: Array<{ url: string }>
) => {
  try {
    // Get request details for email notification
    const { data: request } = await supabase
      .from('maintenance_requests')
      .select(`
        *,
        properties:property_id (
          name,
          address
        )
      `)
      .eq('id', requestId)
      .single();

    if (!request) return;

    // Get admin and manager users
    const { data: adminUsers } = await supabase
      .from('profiles')
      .select('id, email, name')
      .in('role', ['admin', 'manager'])
      .not('email', 'is', null);

    // Get request owner
    const { data: requestOwner } = await supabase
      .from('profiles')
      .select('id, email, name')
      .eq('id', request.user_id)
      .single();

    const notificationData = {
      request_id: requestId,
      request_title: request.title || '',
      request_description: request.description || '',
      request_location: request.location || '',
      request_priority: request.priority || '',
      request_status: 'completed',
      property_name: request.properties?.name || '',
      property_address: request.properties?.address || '',
      comment_text: `Job has been completed by ${contractorName}${completionPhotos?.length ? ` with ${completionPhotos.length} completion photos` : ''}`,
      commenter_name: contractorName,
      commenter_role: 'contractor',
      comment_date: new Date().toISOString(),
      direct_link: `https://ltjlswzrdgtoddyqmydo.supabase.co/requests/${requestId}`,
      completion_photos: completionPhotos
    };

    // Send notifications to admin/manager users
    if (adminUsers) {
      for (const user of adminUsers) {
        if (user.email) {
          await supabase.functions.invoke('send-comment-notification', {
            body: {
              recipient_email: user.email,
              recipient_name: user.name || '',
              notification_data: notificationData
            }
          });
        }
      }
    }

    // Send notification to request owner
    if (requestOwner?.email) {
      await supabase.functions.invoke('send-comment-notification', {
        body: {
          recipient_email: requestOwner.email,
          recipient_name: requestOwner.name || '',
          notification_data: notificationData
        }
      });
    }

  } catch (error) {
    console.error('Error sending job completion notification:', error);
    // Don't throw here to prevent breaking the main operation
  }
};
