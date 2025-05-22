
import React, { memo, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Bell, BellDot } from 'lucide-react';
import { useUserContext } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import useNotifications from '@/hooks/useNotifications';

export const NotificationBell = memo(() => {
  const { currentUser } = useUserContext();
  const navigate = useNavigate();
  const { notifications } = useNotifications();
  
  // Memoize unread count calculation to prevent unnecessary rerenders
  const unreadCount = useMemo(() => {
    return notifications?.filter(n => !n.isRead)?.length || 0;
  }, [notifications]);
  
  // Memoize hasUnread value
  const hasUnread = useMemo(() => unreadCount > 0, [unreadCount]);

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
});

export default NotificationBell;
