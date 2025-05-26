
import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { ContractorHeader } from '@/components/contractor/ContractorHeader';
import NotificationsList from '@/components/notifications/NotificationsList';
import { useContractorNotifications } from '@/hooks/useContractorNotifications';

const ContractorNotifications = () => {
  const { 
    loading, 
    notifications, 
    markingAllRead, 
    unreadCount,
    markAllAsRead, 
    handleNotificationClick 
  } = useContractorNotifications();

  return (
    <div className="min-h-screen bg-gray-50">
      <ContractorHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Contractor Notifications</h1>
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

export default ContractorNotifications;
