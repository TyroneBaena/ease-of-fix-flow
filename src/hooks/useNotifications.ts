
import { useState, useEffect } from 'react';
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
    // Cast the type to ensure it matches our expected values
    type: dbNotification.type as 'info' | 'success' | 'warning' | 'error',
    link: dbNotification.link,
    user_id: dbNotification.user_id
  };
};

export const useNotifications = () => {
  const { currentUser, updateUser } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationClient[]>([]);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Fetch notifications when component mounts
  useEffect(() => {
    // Prevent multiple fetches and infinite loops
    if (!hasInitialized) {
      fetchNotifications();
      setHasInitialized(true);
    }
  }, [hasInitialized]);
  
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      if (currentUser) {
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
          // Convert to client notification format
          const clientNotifications = fetchedData.map(mapToClientNotification);
          setNotifications(clientNotifications);
          
          // Update the user's unread count in the context
          const unreadCount = fetchedData.filter(n => !n.is_read).length;
          updateUser({
            ...currentUser,
            unreadNotifications: unreadCount
          });
        } else {
          // Fallback to mock data if no notifications in database yet
          const mockNotifications: NotificationClient[] = [
            {
              id: '1',
              title: 'New maintenance request',
              message: `A new maintenance request has been submitted for ${currentUser.name}'s property`,
              isRead: false,
              createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
              type: 'info',
              link: '/requests/123',
              user_id: currentUser.id
            },
            {
              id: '2',
              title: 'Request approved',
              message: `Your maintenance request for ${currentUser.name}'s property has been approved`,
              isRead: true,
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
              type: 'success',
              link: '/requests/456',
              user_id: currentUser.id
            },
            {
              id: '3',
              title: 'Urgent: Contractor needed',
              message: 'An urgent request requires your attention',
              isRead: false,
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
              type: 'warning',
              link: '/requests/789',
              user_id: currentUser.id
            },
            {
              id: '4',
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
          
          // Setup initial notifications in the database
          for (const notification of mockNotifications) {
            // Convert to database format (camelCase to snake_case)
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
          
          // Update the user's unread count in the context if needed
          if (currentUser && currentUser.unreadNotifications === undefined) {
            const unreadCount = mockNotifications.filter(n => !n.isRead).length;
            updateUser({
              ...currentUser,
              unreadNotifications: unreadCount
            });
          }
        }
        
        setLoading(false);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error("Failed to load notifications");
      setLoading(false);
    }
  };
  
  const markAllAsRead = async () => {
    try {
      setMarkingAllRead(true);
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({
          ...notification,
          isRead: true
        }))
      );
      
      // Update in database
      const notificationIds = notifications.map(n => n.id);
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', notificationIds)
        .eq('user_id', currentUser.id);
      
      if (error) {
        throw error;
      }
      
      // Update user context
      const updatedUser = {
        ...currentUser,
        unreadNotifications: 0
      };
      await updateUser(updatedUser);
      
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
      
      // Update local state
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
      
      // Update user's unread count
      const unreadCount = notifications.filter(n => !n.isRead && n.id !== notificationId).length;
      const updatedUser = {
        ...currentUser,
        unreadNotifications: unreadCount
      };
      await updateUser(updatedUser);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to update notification');
    }
  };
  
  const handleNotificationClick = (notification: NotificationClient) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    // In a real app, navigate to the linked page if available
    if (notification.link) {
      console.log(`Would navigate to: ${notification.link}`);
      // navigate(notification.link);
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
