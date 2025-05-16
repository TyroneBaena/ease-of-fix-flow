
import React from 'react';
import { Bell } from 'lucide-react';

const NotificationEmpty = () => {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <Bell className="h-16 w-16 text-gray-300 mb-4" />
      <h2 className="text-xl font-medium text-gray-700">No notifications</h2>
      <p className="text-gray-500 mt-2">
        You don't have any notifications at the moment
      </p>
    </div>
  );
};

export default NotificationEmpty;
