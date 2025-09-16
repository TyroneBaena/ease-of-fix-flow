
import React from 'react';
import { Button } from "@/components/ui/button";
import { Bell, BellDot } from 'lucide-react';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
  const { currentUser } = useUserContext();
  const navigate = useNavigate();
  
  // Check if user has unread notifications
  const hasUnread = currentUser?.unreadNotifications && currentUser.unreadNotifications > 0;

  const handleNotificationClick = () => {
    navigate('/notifications');
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleNotificationClick}
      aria-label={hasUnread ? "You have unread notifications" : "No unread notifications"}
    >
      {hasUnread ? <BellDot className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
    </Button>
  );
};

export default NotificationBell;
