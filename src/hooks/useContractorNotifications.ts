import { useState, useEffect, useCallback } from 'react';
import { NotificationClient } from '@/types/notification';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from 'sonner';
import { notificationService } from '@/services/notificationService';
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

export const useContractorNotifications = () => {
  const { currentUser } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationClient[]>([]);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Only proceed if user is a contractor
  const isContractor = currentUser?.role === 'contractor';
  
  // Handle new notification from real-time subscription
  const handleNewNotification = useCallback((newNotification: NotificationClient) => {
    console.log('Contractor received new notification:', newNotification);
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  // Set up real-time subscription for contractors
  useEffect(() => {
    if (currentUser?.id && isContractor) {
      console.log('Setting up contractor notification subscription for user:', currentUser.id);
      notificationService.subscribeToUserNotifications(
        currentUser.id, 
        handleNewNotification
      );

      return () => {
        console.log('Cleaning up contractor notification subscription');
        notificationService.unsubscribeFromUserNotifications(currentUser.id);
      };
    }
  }, [currentUser?.id, isContractor, handleNewNotification]);
  
  // Fetch notifications when component mounts
  useEffect(() => {
    if (currentUser?.id && isContractor && !hasInitialized) {
      fetchNotificationsData();
      setHasInitialized(true);
    }
  }, [currentUser?.id, isContractor, hasInitialized]);
  
  const fetchNotificationsData = useCallback(async () => {
    if (!currentUser || !isContractor) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      const fetchedData = await fetchNotifications(currentUser.id);
        
      // If we have real data from database, use it
      if (fetchedData && fetchedData.length > 0) {
        console.log('Found contractor notifications in database:', fetchedData.length);
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
      console.error('Error fetching contractor notifications:', error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [currentUser, isContractor]);

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
    console.log('Contractor notification clicked:', notification);
    
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

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return {
    loading,
    notifications,
    markingAllRead,
    unreadCount,
    markAllAsRead,
    handleNotificationClick
  };
};

export default useContractorNotifications;
