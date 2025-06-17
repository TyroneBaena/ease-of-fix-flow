
import { NotificationClient } from '@/types/notification';
import { supabase } from '@/lib/supabase';

export const generateMockContractorNotifications = async (currentUserId: string): Promise<NotificationClient[]> => {
  console.log('No notifications found, creating mock contractor notifications');
  
  // Get some maintenance requests to create realistic notifications
  const { data: requestsData } = await supabase
    .from('maintenance_requests')
    .select('id, title, status')
    .limit(5);
  
  const mockNotifications: NotificationClient[] = [];
  
  if (requestsData && requestsData.length > 0) {
    // Create notifications for existing requests - use contractor-specific routes
    requestsData.forEach((request, index) => {
      if (index === 0) {
        mockNotifications.push({
          id: crypto.randomUUID(),
          title: 'New Quote Request',
          message: `Quote requested for: ${request.title}`,
          isRead: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          type: 'warning',
          link: `/contractor/quote-submission/${request.id}`,
          user_id: currentUserId
        });
      } else if (index === 1) {
        mockNotifications.push({
          id: crypto.randomUUID(),
          title: 'Job Assignment',
          message: `You have been assigned to: ${request.title}`,
          isRead: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          type: 'info',
          link: `/contractor-jobs/${request.id}`,
          user_id: currentUserId
        });
      } else if (index === 2) {
        mockNotifications.push({
          id: crypto.randomUUID(),
          title: 'Quote Approved',
          message: `Your quote for "${request.title}" has been approved`,
          isRead: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          type: 'success',
          link: `/contractor-jobs/${request.id}`,
          user_id: currentUserId
        });
      }
    });
  }
  
  // Add some general notifications with safe contractor routes
  mockNotifications.push({
    id: crypto.randomUUID(),
    title: 'Schedule Update',
    message: 'Your schedule for tomorrow has been updated',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    type: 'info',
    link: '/contractor-schedule',
    user_id: currentUserId
  });

  return mockNotifications;
};

export const storeMockNotifications = async (notifications: NotificationClient[]): Promise<void> => {
  for (const notification of notifications) {
    const { error } = await supabase.from('notifications').upsert({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      is_read: notification.isRead,
      created_at: notification.createdAt,
      type: notification.type,
      link: notification.link,
      user_id: notification.user_id
    });
    
    if (error) {
      console.error('Error storing mock notification:', error);
    }
  }
};
