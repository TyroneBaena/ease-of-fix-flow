import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useFileUpload } from './useFileUpload';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

interface Attachment {
  url: string;
  name: string;
  type: string;
}

const sendPhotoUploadNotifications = async (
  requestId: string,
  uploadCount: number,
  uploaderName: string
) => {
  try {
    // Get request details with property info
    const { data: request } = await supabase
      .from('maintenance_requests')
      .select(`
        *,
        properties:property_id (
          id,
          name,
          practice_leader_email
        )
      `)
      .eq('id', requestId)
      .single();

    if (!request) {
      console.error('Request not found for photo upload notification');
      return;
    }

    const notificationTitle = 'New Photos Added to Request';
    const notificationMessage = `${uploaderName} added ${uploadCount} photo(s) to "${request.title}"`;
    const notificationLink = `/requests/${requestId}`;

    // Get admins and managers assigned to this property
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .eq('organization_id', request.organization_id);

    const { data: managers } = await supabase
      .from('profiles')
      .select('id, assigned_properties')
      .eq('role', 'manager')
      .eq('organization_id', request.organization_id);

    // Filter managers who have this property assigned
    const assignedManagers = (managers || []).filter(manager =>
      manager.assigned_properties?.includes(request.property_id)
    );

    // Combine recipients (deduplicated)
    const notifyUserIds = new Set<string>();
    
    // Add all admins
    (admins || []).forEach(admin => notifyUserIds.add(admin.id));
    
    // Add assigned managers (practice leaders)
    assignedManagers.forEach(manager => notifyUserIds.add(manager.id));

    console.log(`📸 Sending photo upload notifications to ${notifyUserIds.size} users`);

    // Create notifications
    for (const userId of notifyUserIds) {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: notificationTitle,
          message: notificationMessage,
          type: 'info',
          link: notificationLink,
          organization_id: request.organization_id
        });

      if (error) {
        console.error('Error creating notification for user:', userId, error);
      }
    }

    console.log(`✅ Sent photo upload notifications to ${notifyUserIds.size} users`);
  } catch (error) {
    console.error('Error sending photo upload notifications:', error);
  }
};

export const useAddAttachments = () => {
  const [isAdding, setIsAdding] = useState(false);
  const { uploadFiles, isUploading } = useFileUpload();

  const addAttachments = async (
    requestId: string, 
    files: File[], 
    existingAttachments: Attachment[] | null,
    uploaderName?: string
  ): Promise<Attachment[] | null> => {
    setIsAdding(true);
    try {
      // Upload new files to storage
      const uploadedFiles = await uploadFiles(files);
      if (uploadedFiles.length === 0) {
        throw new Error('No files were uploaded');
      }

      // Merge with existing attachments
      const currentAttachments = existingAttachments || [];
      const combinedAttachments = [...currentAttachments, ...uploadedFiles];

      // Update the maintenance request
      const { error } = await supabase
        .from('maintenance_requests')
        .update({ 
          attachments: combinedAttachments as unknown as Json,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // Send in-app notifications (async, don't block)
      sendPhotoUploadNotifications(
        requestId,
        uploadedFiles.length,
        uploaderName || 'Someone'
      ).catch(err => console.error('Photo notification error:', err));

      // Auto-transition status to in-progress if admin/manager adds attachments to pending/open request
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          
          const { data: requestData } = await supabase
            .from('maintenance_requests')
            .select('status')
            .eq('id', requestId)
            .single();
            
          if (profile && requestData && (profile.role === 'admin' || profile.role === 'manager')) {
            if (requestData.status === 'pending' || requestData.status === 'open') {
              console.log('useAddAttachments - Auto-transitioning to in-progress');
              const { autoTransitionToInProgress } = await import('@/utils/statusTransitions');
              await autoTransitionToInProgress(requestId, requestData.status, profile.role);
            }
          }
        }
      } catch (transitionError) {
        console.error('Error auto-transitioning status:', transitionError);
      }

      toast.success(`Added ${uploadedFiles.length} attachment(s)`);
      return combinedAttachments;
    } catch (error) {
      console.error('Error adding attachments:', error);
      toast.error('Failed to add attachments');
      return null;
    } finally {
      setIsAdding(false);
    }
  };

  return { addAttachments, isAdding, isUploading };
};
