
import React from 'react';
import { Button } from "@/components/ui/button";
import { Bell, BellDot } from 'lucide-react';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { useNavigate } from 'react-router-dom';
import { useContractorNotifications } from '@/hooks/useContractorNotifications';

const ContractorNotificationBell = () => {
  const { currentUser } = useUserContext();
  const navigate = useNavigate();
  const { unreadCount, loading } = useContractorNotifications();
  
  // Only show for contractors
  if (!currentUser || currentUser.role !== 'contractor') {
    return null;
  }
  
  // Check if contractor has unread notifications
  const hasUnread = unreadCount > 0;

  const handleNotificationClick = () => {
    console.log('Notification bell clicked, navigating to contractor notifications');
    navigate('/contractor-notifications');
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleNotificationClick}
      aria-label={hasUnread ? `You have ${unreadCount} unread notifications` : "No unread notifications"}
      className="relative"
    >
      {hasUnread ? <BellDot className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
      {hasUnread && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  );
};

export default ContractorNotificationBell;
