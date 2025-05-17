
import React from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { NotificationClient } from '@/types/notification';
import NotificationItem from './NotificationItem';
import NotificationEmpty from './NotificationEmpty';

interface NotificationsListProps {
  notifications: NotificationClient[];
  loading: boolean;
  onNotificationClick: (notification: NotificationClient) => void;
}

const NotificationsList = ({ notifications, loading, onNotificationClick }: NotificationsListProps) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
        <p className="text-gray-500">Loading notifications...</p>
      </div>
    );
  }
  
  if (notifications.length === 0) {
    return <NotificationEmpty />;
  }
  
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Notification</TableHead>
            <TableHead className="w-28">Time</TableHead>
            <TableHead className="w-24">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {notifications.map((notification) => (
            <NotificationItem 
              key={notification.id}
              notification={notification}
              onClick={onNotificationClick}
            />
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};

export default NotificationsList;
