
import { useState, useEffect, useCallback } from 'react';
import { NotificationClient } from '@/types/notification';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

// Convert database notification to client notification (snake_case to camelCase)
const mapToClientNotification = (dbNotification: {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  type: string;
  link?: string;
  user_id: string;
}): NotificationClient => {
  return {
    id: dbNotification.id,
    title: dbNotification.title,
    message: dbNotification.message,
    isRead: dbNotification.is_read,
    createdAt: dbNotification.created_at,
    type: dbNotification.type as 'info' | 'success' | 'warning' | 'error',
    link: dbNotification.link,
    user_id: dbNotification.user_id
  };
};

export const useContractorNotifications = () => {
  const { currentUser } = useUserContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationClient[]>([]);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Fetch contractor-specific notifications
  const fetchNotifications = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'contractor') {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('Fetching contractor notifications for user:', currentUser.id);
      
      // Fetch contractor-specific notifications from Supabase
      const { data: fetchedData, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }
      
      if (fetchedData && fetchedData.length > 0) {
        console.log('Found notifications in database:', fetchedData.length);
        const clientNotifications = fetchedData.map(mapToClientNotification);
        setNotifications(clientNotifications);
        setUnreadCount(fetchedData.filter(n => !n.is_read).length);
      } else {
        console.log('No notifications found, creating mock contractor notifications');
        
        // Get some maintenance requests to create realistic notifications
        const { data: requestsData } = await supabase
          .from('maintenance_requests')
          .select('id, title, status')
          .limit(5);
        
        // Mock contractor-specific notifications with proper request links
        const mockNotifications: NotificationClient[] = [];
        
        if (requestsData && requestsData.length > 0) {
          // Create notifications for existing requests
          requestsData.forEach((request, index) => {
            if (index === 0) {
              mockNotifications.push({
                id: crypto.randomUUID(),
                title: 'New Quote Request',
                message: `Quote requested for: ${request.title}`,
                isRead: false,
                createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
                type: 'warning',
                link: `/contractor/quote-submission/${request.id}`,
                user_id: currentUser.id
              });
            } else if (index === 1) {
              mockNotifications.push({
                id: crypto.randomUUID(),
                title: 'Job Assignment',
                message: `You have been assigned to: ${request.title}`,
                isRead: false,
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
                type: 'info',
                link: `/requests/${request.id}`,
                user_id: currentUser.id
              });
            } else if (index === 2) {
              mockNotifications.push({
                id: crypto.randomUUID(),
                title: 'Quote Approved',
                message: `Your quote for "${request.title}" has been approved`,
                isRead: true,
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
                type: 'success',
                link: `/requests/${request.id}`,
                user_id: currentUser.id
              });
            }
          });
        }
        
        // Add some general notifications
        mockNotifications.push({
          id: crypto.randomUUID(),
          title: 'Schedule Update',
          message: 'Your schedule for tomorrow has been updated',
          isRead: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
          type: 'info',
          link: '/contractor-schedule',
          user_id: currentUser.id
        });

        setNotifications(mockNotifications);
        setUnreadCount(mockNotifications.filter(n => !n.isRead).length);
        
        // Store mock notifications in database for future use
        for (const notification of mockNotifications) {
          const { error } = await supabase.from('notifications').upsert({
            id: notification.id,
            title: notification.title,
            message: notification.message,
            is_read: notification.isRead,
            created_at: notification.createdAt,
            type: notification.type,
            link: notification.link,
            user_id: notification.user_id
          });
          
          if (error) {
            console.error('Error storing mock notification:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching contractor notifications:', error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  
  // Fetch notifications when component mounts
  useEffect(() => {
    if (currentUser?.role === 'contractor') {
      fetchNotifications();
    }
  }, [currentUser, fetchNotifications]);
  
  const markAllAsRead = async () => {
    try {
      setMarkingAllRead(true);
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      const unreadNotifications = notifications.filter(n => !n.isRead);
      if (unreadNotifications.length === 0) {
        setMarkingAllRead(false);
        return;
      }
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({
          ...notification,
          isRead: true
        }))
      );
      
      setUnreadCount(0);
      
      // Update in database
      const notificationIds = unreadNotifications.map(n => n.id);
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', notificationIds)
        .eq('user_id', currentUser.id);
      
      if (error) {
        throw error;
      }
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      toast.error('Failed to update notifications');
    } finally {
      setMarkingAllRead(false);
    }
  };
  
  const markAsRead = async (notificationId: string) => {
    try {
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      const notification = notifications.find(n => n.id === notificationId);
      if (!notification || notification.isRead) {
        return;
      }
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Update in database
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', currentUser.id);
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to update notification');
    }
  };
  
  const handleNotificationClick = (notification: NotificationClient) => {
    console.log('Notification clicked:', notification);
    
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    if (notification.link) {
      console.log(`Navigating to: ${notification.link}`);
      navigate(notification.link);
    }
  };

  return {
    loading,
    notifications,
    markingAllRead,
    unreadCount,
    markAllAsRead,
    handleNotificationClick
  };
};
