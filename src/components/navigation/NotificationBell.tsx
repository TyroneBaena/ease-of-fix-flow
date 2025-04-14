
import React from 'react';
import { Button } from "@/components/ui/button";
import { Bell } from 'lucide-react';

export const NotificationBell = () => {
  return (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
    </Button>
  );
};

export default NotificationBell;
