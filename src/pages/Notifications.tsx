
import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useUserContext } from '@/contexts/UserContext';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, CheckCircle, AlertCircle, Info, Bell } from 'lucide-react';
import { Notification } from '@/types/notification';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';

const Notifications = () => {
  const { currentUser, updateUser } = useUserContext();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  
  // Fetch notifications when component mounts
  useEffect(() => {
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

    fetchNotifications();
  }, [currentUser, updateUser]);
  
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
  
  const getNotificationIcon = (type: Notification['type']) => {
    switch(type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
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
        
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
            <p className="text-gray-500">Loading notifications...</p>
          </div>
        ) : notifications.length > 0 ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Notification</TableHead>
                  <TableHead className="w-28">Time</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((notification) => (
                  <TableRow 
                    key={notification.id} 
                    className={`cursor-pointer ${!notification.isRead ? 'bg-blue-50' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <TableCell>
                      {getNotificationIcon(notification.type)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{notification.title}</div>
                      <div className="text-gray-500">{notification.message}</div>
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      {notification.isRead ? (
                        <Badge variant="outline" className="text-gray-500">Read</Badge>
                      ) : (
                        <Badge className="bg-blue-500">New</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Bell className="h-16 w-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-medium text-gray-700">No notifications</h2>
            <p className="text-gray-500 mt-2">
              You don't have any notifications at the moment
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Notifications;
