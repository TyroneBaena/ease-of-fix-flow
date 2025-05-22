
import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Bell, BellDot } from 'lucide-react';
import { useUserContext } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import useNotifications from '@/hooks/useNotifications';

export const NotificationBell = ({ }) => {
  const { currentUser, updateUser } = useUserContext();
  const navigate = useNavigate();
  const { notifications, loading } = useNotifications();
  
  // Calculate unread count directly from notifications data
  const unreadCount = notifications?.filter(n => !n.isRead)?.length || 0;
  
  // Determine if there are any unread notifications
  const hasUnread = unreadCount > 0;

  // Update user context with unread count when notifications change
  useEffect(() => {
    if (currentUser && !loading && notifications.length > 0) {
      // Only update if the counts are different
      if (currentUser.unreadNotifications !== unreadCount) {
        updateUser({
          ...currentUser,
          unreadNotifications: unreadCount
        });
      }
    }
  }, [notifications, currentUser, loading, unreadCount, updateUser]);

  const handleNotificationClick = () => {
    navigate('/notifications');
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="relative"
      onClick={handleNotificationClick}
      aria-label={hasUnread ? `${unreadCount} unread notifications` : "No unread notifications"}
    >
      {hasUnread ? <BellDot className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
      {hasUnread && (
        <span className="absolute top-0 right-0 flex items-center justify-center min-w-[1.25rem] h-5 text-xs font-medium text-white bg-red-500 rounded-full px-1">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Button>
  );
};

export default NotificationBell;
