
import React from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import NotificationsList from '@/components/notifications/NotificationsList';
import useNotifications from '@/hooks/useNotifications';

const Notifications = () => {
  const { 
    loading, 
    notifications, 
    markingAllRead, 
    markAllAsRead, 
    handleNotificationClick 
  } = useNotifications();
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-gray-500">
              {loading ? "Loading..." : `${unreadCount} unread notifications`}
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
