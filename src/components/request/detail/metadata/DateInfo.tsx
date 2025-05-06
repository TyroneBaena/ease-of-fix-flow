
import React from 'react';
import { Calendar } from 'lucide-react';

interface DateInfoProps {
  reportDate: string;
}

export const DateInfo = ({ reportDate }: DateInfoProps) => {
  return (
    <div className="flex items-center">
      <Calendar className="h-4 w-4 text-gray-500 mr-2" />
      <div>
        <p className="text-xs text-gray-500">Report Date</p>
        <p className="font-medium">{reportDate}</p>
      </div>
    </div>
  );
};
