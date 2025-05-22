
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
  
  // Refs to prevent unnecessary updates
  const lastUpdateTimeRef = useRef<number>(0);
  const pendingUpdateRef = useRef<boolean>(false);
  const unreadCountRef = useRef<number | null>(null);
  const lastFetchedUserIdRef = useRef<string | null>(null);
  
  // Fetch notifications when component mounts
  useEffect(() => {
    // Only fetch if we have a user and haven't initialized yet
    if (currentUser?.id && !hasInitialized) {
      // Track the current user ID to prevent refetches if user changes
      lastFetchedUserIdRef.current = currentUser.id;
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
        
        // Update the unread count in our ref (but don't update user context yet)
        const unreadCount = fetchedData.filter(n => !n.is_read).length;
        unreadCountRef.current = unreadCount;
        
        // Only update user context if the count has changed and we haven't recently updated
        if (currentUser.unreadNotifications !== unreadCount) {
          scheduleUserUpdate();
        }
      } else {
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
        
        // Update the unread count in our ref
        const unreadCount = mockNotifications.filter(n => !n.isRead).length;
        unreadCountRef.current = unreadCount;
        
        // Schedule an update only if needed
        if (currentUser && 
            (currentUser.unreadNotifications === undefined || 
             currentUser.unreadNotifications !== unreadCount)) {
          scheduleUserUpdate();
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);
  
  // Controlled and throttled user context update
  const scheduleUserUpdate = useCallback(() => {
    // Skip if already pending or no current user
    if (pendingUpdateRef.current || !currentUser || unreadCountRef.current === null) {
      return;
    }
    
    const now = Date.now();
    
    // Only update once per 10 seconds maximum
    if (now - lastUpdateTimeRef.current < 10000) {
      // If update was too recent, schedule one for later and don't proceed
      if (!pendingUpdateRef.current) {
        pendingUpdateRef.current = true;
        setTimeout(() => {
          pendingUpdateRef.current = false;
          scheduleUserUpdate();
        }, 10000 - (now - lastUpdateTimeRef.current));
      }
      return;
    }
    
    // If the unread count hasn't changed, don't update
    if (currentUser.unreadNotifications === unreadCountRef.current) {
      return;
    }
    
    // Update user context
    lastUpdateTimeRef.current = now;
    updateUser({
      ...currentUser,
      unreadNotifications: unreadCountRef.current
    });
  }, [currentUser, updateUser]);
  
  const markAllAsRead = async () => {
    try {
      setMarkingAllRead(true);
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      // Don't proceed if there are no unread notifications
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
      
      // Update unread count ref
      unreadCountRef.current = 0;
      
      // Schedule update of user context
      scheduleUserUpdate();
      
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
      
      // Check if the notification is already read
      const notification = notifications.find(n => n.id === notificationId);
      if (!notification || notification.isRead) {
        return; // Already read, no need to update
      }
      
      // Validate UUID format before sending to Supabase
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notificationId)) {
        console.error('Invalid UUID format:', notificationId);
        toast.error('Invalid notification reference');
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
      
      // Update in database
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', currentUser.id);
      
      if (error) {
        throw error;
      }
      
      // Update unread count ref
      const newUnreadCount = notifications.filter(n => !n.isRead && n.id !== notificationId).length;
      unreadCountRef.current = newUnreadCount;
      
      // Schedule update of user context if needed
      if (currentUser.unreadNotifications !== newUnreadCount) {
        scheduleUserUpdate();
      }
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
