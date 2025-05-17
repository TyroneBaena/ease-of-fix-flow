
export interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  user_id: string;
}

// Interface for the client-side representation (camelCase keys)
export interface NotificationClient {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  user_id: string;
}
