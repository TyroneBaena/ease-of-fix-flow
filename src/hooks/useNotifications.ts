
import { useState, useEffect } from 'react';
import { Notification } from '@/types/notification';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export const useNotifications = () => {
  const { currentUser, updateUser } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
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
        // In a real implementation, fetch from Supabase
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
          setNotifications(fetchedData);
          
          // Update the user's unread count in the context
          if (currentUser) {
            const unreadCount = fetchedData.filter(n => !n.isRead).length;
            updateUser({
              ...currentUser,
              unreadNotifications: unreadCount
            });
          }
        } else {
          // Fallback to mock data if no notifications in database yet
          const mockNotifications = [
            {
              id: '1',
              title: 'New maintenance request',
              message: `A new maintenance request has been submitted for ${currentUser.name}'s property`,
              isRead: false,
              createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
              type: 'info' as const,
              link: '/requests/123',
              user_id: currentUser.id
            },
            {
              id: '2',
              title: 'Request approved',
              message: `Your maintenance request for ${currentUser.name}'s property has been approved`,
              isRead: true,
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
              type: 'success' as const,
              link: '/requests/456',
              user_id: currentUser.id
            },
            {
              id: '3',
              title: 'Urgent: Contractor needed',
              message: 'An urgent request requires your attention',
              isRead: false,
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
              type: 'warning' as const,
              link: '/requests/789',
              user_id: currentUser.id
            },
            {
              id: '4',
              title: 'Request rejected',
              message: `The quote for ${currentUser.name}'s property was rejected`,
              isRead: false,
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
              type: 'error' as const,
              link: '/requests/101',
              user_id: currentUser.id
            }
          ];

          setNotifications(mockNotifications);
          
          // Setup initial notifications in the database
          for (const notification of mockNotifications) {
            await supabase.from('notifications').upsert({
              ...notification,
              id: notification.id
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
        .update({ isRead: true })
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
        .update({ isRead: true })
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
  
  const handleNotificationClick = (notification: Notification) => {
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
