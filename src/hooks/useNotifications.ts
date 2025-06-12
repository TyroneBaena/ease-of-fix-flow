
import { useState, useEffect, useCallback, useRef } from 'react';
import { Notification, NotificationClient } from '@/types/notification';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

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

export const useNotifications = () => {
  const { currentUser } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationClient[]>([]);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Fetch notifications when component mounts
  useEffect(() => {
    if (currentUser?.id && !hasInitialized) {
      fetchNotifications();
      setHasInitialized(true);
    }
  }, [currentUser?.id, hasInitialized]);
  
  const fetchNotifications = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('Fetching notifications for user:', currentUser.id);
      
      // Fetch notifications from Supabase
      const { data: fetchedData, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      // If we have real data from database, use it
      if (fetchedData && fetchedData.length > 0) {
        console.log('Found notifications in database:', fetchedData.length);
        const clientNotifications = fetchedData.map(mapToClientNotification);
        setNotifications(clientNotifications);
      } else {
        console.log('No notifications found, creating mock notifications');
        // Fallback to mock data if no notifications in database yet
        const mockNotifications: NotificationClient[] = [
          {
            id: crypto.randomUUID(),
            title: 'New maintenance request',
            message: `A new maintenance request has been submitted for ${currentUser.name}'s property`,
            isRead: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
            type: 'info',
            link: '/requests/123',
            user_id: currentUser.id
          },
          {
            id: crypto.randomUUID(),
            title: 'Request approved',
            message: `Your maintenance request for ${currentUser.name}'s property has been approved`,
            isRead: true,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
            type: 'success',
            link: '/requests/456',
            user_id: currentUser.id
          },
          {
            id: crypto.randomUUID(),
            title: 'Urgent: Contractor needed',
            message: 'An urgent request requires your attention',
            isRead: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            type: 'warning',
            link: '/requests/789',
            user_id: currentUser.id
          },
          {
            id: crypto.randomUUID(),
            title: 'Request rejected',
            message: `The quote for ${currentUser.name}'s property was rejected`,
            isRead: false,
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
            type: 'error',
            link: '/requests/101',
            user_id: currentUser.id
          }
        ];

        setNotifications(mockNotifications);
        
        // Store mock notifications in database for future use
        for (const notification of mockNotifications) {
          await supabase.from('notifications').upsert({
            id: notification.id,
            title: notification.title,
            message: notification.message,
            is_read: notification.isRead,
            created_at: notification.createdAt,
            type: notification.type,
            link: notification.link,
            user_id: notification.user_id
          });
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  
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
      
      // Update local state first
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({
          ...notification,
          isRead: true
        }))
      );
      
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
      
      // Update local state first
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
      
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
    
    // Simple navigation logging without actual navigation for now
    if (notification.link) {
      console.log(`Would navigate to: ${notification.link}`);
    }
  };

  return {
    loading,
    notifications,
    markingAllRead,
    markAllAsRead,
    handleNotificationClick
  };
};

export default useNotifications;
