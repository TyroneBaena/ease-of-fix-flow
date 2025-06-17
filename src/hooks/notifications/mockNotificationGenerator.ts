
import { NotificationClient } from '@/types/notification';

export const generateMockNotifications = (currentUserId: string, userName: string): NotificationClient[] => {
  console.log('No notifications found, creating mock notifications');
  
  const mockNotifications: NotificationClient[] = [
    {
      id: crypto.randomUUID(),
      title: 'New maintenance request',
      message: `A new maintenance request has been submitted for ${userName}'s property`,
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      type: 'info',
      link: '/requests/123',
      user_id: currentUserId
    },
    {
      id: crypto.randomUUID(),
      title: 'Request approved',
      message: `Your maintenance request for ${userName}'s property has been approved`,
      isRead: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      type: 'success',
      link: '/requests/456',
      user_id: currentUserId
    },
    {
      id: crypto.randomUUID(),
      title: 'Urgent: Contractor needed',
      message: 'An urgent request requires your attention',
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      type: 'warning',
      link: '/requests/789',
      user_id: currentUserId
    },
    {
      id: crypto.randomUUID(),
      title: 'Request rejected',
      message: `The quote for ${userName}'s property was rejected`,
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
      type: 'error',
      link: '/requests/101',
      user_id: currentUserId
    }
  ];

  return mockNotifications;
};
