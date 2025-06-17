
import { useState, useEffect, useCallback } from 'react';
import { NotificationClient } from '@/types/notification';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { 
  mapToClientNotification, 
  validateContractorRoute 
} from './contractor/notificationUtils';
import { 
  generateMockContractorNotifications, 
  storeMockNotifications 
} from './contractor/mockNotificationGenerator';
import { 
  fetchContractorNotifications, 
  markNotificationsAsRead, 
  markSingleNotificationAsRead 
} from './contractor/notificationOperations';

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
      
      const fetchedData = await fetchContractorNotifications(currentUser.id);
      
      if (fetchedData && fetchedData.length > 0) {
        console.log('Found notifications in database:', fetchedData.length);
        const clientNotifications = fetchedData.map(mapToClientNotification);
        setNotifications(clientNotifications);
        setUnreadCount(fetchedData.filter(n => !n.is_read).length);
      } else {
        const mockNotifications = await generateMockContractorNotifications(currentUser.id);
        setNotifications(mockNotifications);
        setUnreadCount(mockNotifications.filter(n => !n.isRead).length);
        
        // Store mock notifications in database for future use
        await storeMockNotifications(mockNotifications);
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
      await markSingleNotificationAsRead(notificationId, currentUser.id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to update notification');
    }
  };
  
  // Safe navigation with contractor route validation
  const handleNotificationClick = (notification: NotificationClient) => {
    console.log('Notification clicked:', notification);
    
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    // Only navigate if we have a valid contractor link
    if (notification.link) {
      if (validateContractorRoute(notification.link)) {
        console.log(`Navigating to valid contractor route: ${notification.link}`);
        navigate(notification.link);
      } else {
        console.log(`Invalid contractor route detected: ${notification.link}, staying on current page`);
        toast.info('Notification details updated');
      }
    } else {
      console.log('No link provided for notification, marking as read only');
      toast.info('Notification marked as read');
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
