
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useUserContext } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Notification } from '@/types/notification';
import { toast } from 'sonner';
import NotificationsList from '@/components/notifications/NotificationsList';
import { supabase } from '@/lib/supabase';

const Notifications = () => {
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
        // In a real implementation, this would fetch from your API or Supabase
        // For now, we'll simulate a network request with a timeout
        setTimeout(() => {
          // This is where you'd normally fetch from an API endpoint
          // For this example, we'll use mock data but as if it were fetched
          const fetchedNotifications = [
            {
              id: '1',
              title: 'New maintenance request',
              message: `A new maintenance request has been submitted for ${currentUser.name}'s property`,
              isRead: false,
              createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
              type: 'info' as const,
              link: '/requests/123'
            },
            {
              id: '2',
              title: 'Request approved',
              message: `Your maintenance request for ${currentUser.name}'s property has been approved`,
              isRead: true,
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
              type: 'success' as const,
              link: '/requests/456'
            },
            {
              id: '3',
              title: 'Urgent: Contractor needed',
              message: 'An urgent request requires your attention',
              isRead: false,
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
              type: 'warning' as const,
              link: '/requests/789'
            },
            {
              id: '4',
              title: 'Request rejected',
              message: `The quote for ${currentUser.name}'s property was rejected`,
              isRead: false,
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
              type: 'error' as const,
              link: '/requests/101'
            }
          ];

          setNotifications(fetchedNotifications);
          
          // Update the user's unread count in the context if needed
          // But we do this once only to avoid infinite loops
          if (currentUser && currentUser.unreadNotifications === undefined) {
            const unreadCount = fetchedNotifications.filter(n => !n.isRead).length;
            updateUser({
              ...currentUser,
              unreadNotifications: unreadCount
            });
          }
          
          setLoading(false);
        }, 800);
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
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({
          ...notification,
          isRead: true
        }))
      );
      
      // In a real app, we would save this to the database
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          unreadNotifications: 0
        };
        await updateUser(updatedUser);
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
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
      
      // Update user's unread count if needed
      if (currentUser) {
        const unreadCount = notifications.filter(n => !n.isRead && n.id !== notificationId).length;
        const updatedUser = {
          ...currentUser,
          unreadNotifications: unreadCount
        };
        await updateUser(updatedUser);
        
        // In a real app, you would also update this in the database
      }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-gray-500">
              {loading ? "Loading..." : `${notifications.filter(n => !n.isRead).length} unread notifications`}
            </p>
          </div>
          <Button 
            onClick={markAllAsRead} 
            variant="outline"
            disabled={markingAllRead || loading || notifications.every(n => n.isRead)}
          >
            {markingAllRead ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : 'Mark all as read'}
          </Button>
        </div>
        
        <NotificationsList 
          notifications={notifications}
          loading={loading}
          onNotificationClick={handleNotificationClick}
        />
      </main>
    </div>
  );
};

export default Notifications;
