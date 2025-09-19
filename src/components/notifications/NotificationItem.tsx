
import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { NotificationClient } from '@/types/notification';
import { formatDistanceToNow } from 'date-fns';

interface NotificationItemProps {
  notification: NotificationClient;
  onClick: (notification: NotificationClient) => void;
}

// Custom comparison function for NotificationItem
const arePropsEqual = (prevProps: NotificationItemProps, nextProps: NotificationItemProps) => {
  const prevNotification = prevProps.notification;
  const nextNotification = nextProps.notification;
  
  return (
    prevNotification.id === nextNotification.id &&
    prevNotification.title === nextNotification.title &&
    prevNotification.message === nextNotification.message &&
    prevNotification.type === nextNotification.type &&
    prevNotification.isRead === nextNotification.isRead &&
    prevNotification.createdAt === nextNotification.createdAt &&
    prevProps.onClick === nextProps.onClick
  );
};

export const NotificationItem = ({ notification, onClick }: NotificationItemProps) => {
  const getNotificationIcon = (type: NotificationClient['type']) => {
    switch(type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'info':
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };
  
  return (
    <TableRow 
      key={notification.id} 
      className={`cursor-pointer ${!notification.isRead ? 'bg-blue-50' : ''}`}
      onClick={() => onClick(notification)}
    >
      <TableCell>
        {getNotificationIcon(notification.type)}
      </TableCell>
      <TableCell>
        <div className="font-medium">{notification.title}</div>
        <div className="text-gray-500">{notification.message}</div>
      </TableCell>
      <TableCell>
        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
      </TableCell>
      <TableCell>
        {notification.isRead ? (
          <Badge variant="outline" className="text-gray-500">Read</Badge>
        ) : (
          <Badge className="bg-blue-500">New</Badge>
        )}
      </TableCell>
    </TableRow>
  );
};

export default React.memo(NotificationItem, arePropsEqual);
