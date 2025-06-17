
import { NotificationClient } from '@/types/notification';

// Convert database notification to client notification (snake_case to camelCase)
export const mapToClientNotification = (dbNotification: {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  type: string;
  link?: string;
  user_id: string;
}): NotificationClient => {
  return {
    id: dbNotification.id,
    title: dbNotification.title,
    message: dbNotification.message,
    isRead: dbNotification.is_read,
    createdAt: dbNotification.created_at,
    type: dbNotification.type as 'info' | 'success' | 'warning' | 'error',
    link: dbNotification.link,
    user_id: dbNotification.user_id
  };
};

// Validate general application routes
export const validateAppRoute = (link: string): boolean => {
  const validAppRoutes = [
    '/dashboard',
    '/requests',
    '/properties',
    '/settings',
    '/notifications',
    '/reports'
  ];
  
  return validAppRoutes.some(route => link.startsWith(route));
};
