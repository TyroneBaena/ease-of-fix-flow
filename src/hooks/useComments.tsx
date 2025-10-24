
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { toast } from '@/lib/toast';

export type Comment = {
  id: string;
  user: string;
  role: string;
  avatar: string;
  text: string;
  timestamp: string;
};

export type DatabaseComment = {
  id: string;
  user_id: string;
  request_id: string;
  text: string;
  user_name: string;
  user_role: string;
  created_at: string;
};

export function useComments(requestId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useUserContext();

  // Function to format database comments to our Comment type
  const formatComments = useCallback((dbComments: DatabaseComment[]): Comment[] => {
    return dbComments.map(comment => ({
      id: comment.id,
      user: comment.user_name,
      role: comment.user_role,
      avatar: '', // Default avatar
      text: comment.text,
      timestamp: formatTimestamp(comment.created_at)
    }));
  }, []);

  // Format timestamp for display
  const formatTimestamp = (timestamp: string): string => {
    const commentDate = new Date(timestamp);
    const now = new Date();
    
    const diffMs = now.getTime() - commentDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return commentDate.toLocaleDateString();
    }
  };

  // Fetch comments for the request
  const fetchComments = useCallback(async () => {
    if (!requestId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching comments:', error);
        toast.error('Failed to fetch comments');
        setComments([]);
      } else {
        console.log('Fetched comments:', data);
        setComments(formatComments(data as DatabaseComment[]));
      }
    } catch (error) {
      console.error('Unexpected error fetching comments:', error);
      toast.error('An error occurred while fetching comments');
    } finally {
      setIsLoading(false);
    }
  }, [requestId, formatComments]);

  // Helper function to extract the actual user ID string
  const extractUserId = useCallback(async (): Promise<string | null> => {
    try {
      // First, try to get the user ID directly from Supabase auth
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error getting auth user:', error);
        return null;
      }
      
      if (user?.id) {
        console.log('Using auth user ID:', user.id);
        return user.id;
      }
      
      console.error('No authenticated user found');
      return null;
    } catch (error) {
      console.error('Error extracting user ID:', error);
      return null;
    }
  }, []);

  // Helper function to send email notifications
  const sendEmailNotifications = useCallback(async (commentData: any) => {
    try {
      console.log('🚀 Starting email notifications for comment:', commentData);
      
      // Get the maintenance request details for email context
      const { data: requestData, error: requestError } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          properties (
            name,
            address
          )
        `)
        .eq('id', requestId)
        .single();
      
      if (requestError || !requestData) {
        console.error('❌ Error fetching request data for email:', requestError);
        return;
      }
      
      console.log('✅ Request data fetched:', requestData);
      
      // Prepare notification data
      const notificationData = {
        request_id: requestId,
        request_title: requestData.title || '',
        request_description: requestData.description || '',
        request_location: requestData.location || '',
        request_priority: requestData.priority || '',
        request_status: requestData.status || '',
        property_name: requestData.properties?.name || '',
        property_address: requestData.properties?.address || '',
        comment_text: commentData.text || '',
        commenter_name: commentData.user_name || '',
        commenter_role: commentData.user_role || '',
        comment_date: commentData.created_at || new Date().toISOString(),
        direct_link: `${window.location.origin}/requests/${requestId}`
      };
      
      console.log('📧 Notification data prepared:', notificationData);
      
      // Send email to request owner (check preferences first)
      if (requestData.user_id) {
        console.log('📨 Checking request owner for user_id:', requestData.user_id);
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('name, email, notification_settings')
          .eq('id', requestData.user_id)
          .single();
          
        console.log('👤 Owner profile:', ownerProfile);
          
        if (ownerProfile?.email) {
          // Check if user has email notifications enabled
          const notificationSettings = ownerProfile.notification_settings as any;
          const emailEnabled = notificationSettings?.emailNotifications ?? true;
          
          if (emailEnabled) {
            console.log('📬 Sending email to request owner:', ownerProfile.email);
            const { data, error } = await supabase.functions.invoke('send-comment-notification', {
              body: {
                recipient_email: ownerProfile.email,
                recipient_name: ownerProfile.name || '',
                notification_data: notificationData
              }
            });
            console.log('📧 Owner email result:', { data, error });
          } else {
            console.log('⏭️ Skipping owner email - notifications disabled by user');
          }
        }
      }
      
      // Send email to assigned contractor (check preferences first)
      if (requestData.contractor_id) {
        console.log('🔧 Checking contractor for contractor_id:', requestData.contractor_id);
        const { data: contractorData } = await supabase
          .from('contractors')
          .select('contact_name, email, user_id')
          .eq('id', requestData.contractor_id)
          .single();
          
        console.log('👷 Contractor data:', contractorData);
          
        if (contractorData?.email && contractorData?.user_id) {
          // Check contractor's notification preferences
          const { data: contractorProfile } = await supabase
            .from('profiles')
            .select('notification_settings')
            .eq('id', contractorData.user_id)
            .single();
          
          const notificationSettings = contractorProfile?.notification_settings as any;
          const emailEnabled = notificationSettings?.emailNotifications ?? true;
          
          if (emailEnabled) {
            console.log('📬 Sending email to contractor:', contractorData.email);
            const { data, error } = await supabase.functions.invoke('send-comment-notification', {
              body: {
                recipient_email: contractorData.email,
                recipient_name: contractorData.contact_name || '',
                notification_data: notificationData
              }
            });
            console.log('📧 Contractor email result:', { data, error });
          } else {
            console.log('⏭️ Skipping contractor email - notifications disabled by user');
          }
        }
      }
      
      // Send email to all admin users (check preferences for each)
      console.log('👑 Fetching admin users...');
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id, name, email, notification_settings')
        .eq('role', 'admin')
        .not('email', 'is', null);
        
      console.log('👑 Admin profiles:', adminProfiles);
        
      if (adminProfiles && adminProfiles.length > 0) {
        for (const admin of adminProfiles) {
          const notificationSettings = admin.notification_settings as any;
          const emailEnabled = notificationSettings?.emailNotifications ?? true;
          
          if (emailEnabled) {
            console.log('📬 Sending email to admin:', admin.email);
            const { data, error } = await supabase.functions.invoke('send-comment-notification', {
              body: {
                recipient_email: admin.email,
                recipient_name: admin.name || '',
                notification_data: notificationData
              }
            });
            console.log('📧 Admin email result:', { data, error });
          } else {
            console.log('⏭️ Skipping admin email - notifications disabled by user:', admin.email);
          }
        }
      }
      
      console.log('✅ Email notifications completed');
      
    } catch (error) {
      console.error('❌ Error sending email notifications:', error);
      // Don't throw error as this shouldn't fail the comment creation
    }
  }, [requestId]);

  // Add a new comment
  const addComment = useCallback(async (text: string) => {
    if (!requestId || !currentUser) {
      toast.error('You must be logged in to add comments');
      return false;
    }
    
    try {
      console.log('Adding comment for request:', requestId);
      console.log('Current user context:', currentUser);
      
      // Get current user ID from Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Auth error:', authError);
        toast.error('Authentication error. Please log in again.');
        return false;
      }
      
      // Explicitly set user_id to satisfy RLS policy requirements
      const { data, error } = await supabase
        .from('comments')
        .insert({
          user_id: user.id,
          request_id: requestId,
          text: text.trim(),
          user_name: currentUser.name || currentUser.email || 'Anonymous',
          user_role: currentUser.role || 'User'
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error adding comment:', error);
        toast.error(`Failed to add comment: ${error.message}`);
        return false;
      }
      
      console.log('Comment added successfully:', data);
      
      // Send email notifications (async, don't wait for completion)
      console.log('🚀 Triggering email notifications...');
      sendEmailNotifications(data).catch(error => 
        console.error('❌ Email notification failed:', error)
      );
      
      // Refresh comments to get the new one
      await fetchComments();
      toast.success('Comment added');
      return true;
    } catch (error) {
      console.error('Unexpected error adding comment:', error);
      toast.error('An error occurred while adding your comment');
      return false;
    }
  }, [requestId, currentUser, fetchComments, sendEmailNotifications]);

  // Fetch comments on mount and when requestId changes
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    comments,
    isLoading,
    addComment,
    refreshComments: fetchComments
  };
}
