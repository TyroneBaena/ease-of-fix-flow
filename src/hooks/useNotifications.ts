
import { useState, useEffect, useCallback } from 'react';
import { NotificationClient } from '@/types/notification';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from 'sonner';
import { 
  mapToClientNotification, 
  validateAppRoute 
} from './notifications/notificationUtils';
import { 
  generateMockNotifications 
} from './notifications/mockNotificationGenerator';
import { 
  fetchNotifications, 
  markNotificationsAsRead, 
  markSingleNotificationAsRead,
  storeNotifications
} from './notifications/notificationOperations';

export const useNotifications = () => {
  const { currentUser } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationClient[]>([]);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Fetch notifications when component mounts
  useEffect(() => {
    if (currentUser?.id && !hasInitialized) {
      fetchNotificationsData();
      setHasInitialized(true);
    }
  }, [currentUser?.id, hasInitialized]);
  
  const fetchNotificationsData = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      const fetchedData = await fetchNotifications(currentUser.id);
        
      // If we have real data from database, use it
      if (fetchedData && fetchedData.length > 0) {
        console.log('Found notifications in database:', fetchedData.length);
        const clientNotifications = fetchedData.map(mapToClientNotification);
        setNotifications(clientNotifications);
      } else {
        // Fallback to mock data if no notifications in database yet
        const mockNotifications = generateMockNotifications(currentUser.id, currentUser.name);
        setNotifications(mockNotifications);
        
        // Store mock notifications in database for future use
        await storeNotifications(mockNotifications);
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
      await markNotificationsAsRead(notificationIds, currentUser.id);
      
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
      await markSingleNotificationAsRead(notificationId, currentUser.id);
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
      if (validateAppRoute(notification.link)) {
        console.log(`Would navigate to valid route: ${notification.link}`);
      } else {
        console.log(`Invalid route detected: ${notification.link}, staying on current page`);
      }
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
