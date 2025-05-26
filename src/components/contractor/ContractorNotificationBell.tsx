
import React from 'react';
import { Button } from "@/components/ui/button";
import { Bell, BellDot } from 'lucide-react';
import { useUserContext } from '@/contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { useContractorNotifications } from '@/hooks/useContractorNotifications';

const ContractorNotificationBell = () => {
  const { currentUser } = useUserContext();
  const navigate = useNavigate();
  const { unreadCount } = useContractorNotifications();
  
  // Check if contractor has unread notifications
  const hasUnread = unreadCount > 0;

  const handleNotificationClick = () => {
    navigate('/contractor-notifications');
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

export default ContractorNotificationBell;
