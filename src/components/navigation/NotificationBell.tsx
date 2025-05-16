
import React from 'react';
import { Button } from "@/components/ui/button";
import { Bell, BellDot } from 'lucide-react';
import { useUserContext } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';

export const NotificationBell = () => {
  const { currentUser } = useUserContext();
  const navigate = useNavigate();
  
  // Get unread notifications count (default to 0 if not available)
  const unreadCount = currentUser?.unreadNotifications || 0;
  
  // Determine if there are any unread notifications
  const hasUnread = unreadCount > 0;

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
