
import React from 'react';
import { User } from 'lucide-react';

interface UserInfoProps {
  label: string;
  value: string;
}

export const UserInfo = ({ label, value }: UserInfoProps) => {
  return (
    <div className="flex items-center">
      <User className="h-4 w-4 text-gray-500 mr-2" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
};
