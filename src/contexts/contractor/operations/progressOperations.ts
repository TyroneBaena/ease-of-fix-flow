
import { supabase } from '@/lib/supabase';

import { logActivity } from './helpers/activityHelpers';

export const updateJobProgressStatus = async (
  requestId: string, 
  progress: number, 
  notes?: string,
  completionPhotos?: Array<{ url: string }>
) => {
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

  if (progress === 100) {
    updates.status = 'completed';
  }

  const { error } = await supabase
    .from('maintenance_requests')
    .update(updates)
    .eq('id', requestId);

  if (error) throw error;

  // Get contractor information for activity logging
  const { data: contractorData } = await supabase
    .from('contractors')
    .select('contact_name')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  // Log activity based on progress
  if (progress === 100) {
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
    await sendJobCompletionNotification(requestId, contractorData?.contact_name || 'Unknown Contractor', completionPhotos);
  } else {
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
