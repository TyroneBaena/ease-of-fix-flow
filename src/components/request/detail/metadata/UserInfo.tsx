
import React from 'react';
import { User } from 'lucide-react';

interface UserInfoProps {
  label: string;
  value: string;
  isContractor?: boolean;
  contractorInfo?: {
    companyName?: string;
    contactName?: string;
  };
}

export const UserInfo = ({ label, value, isContractor, contractorInfo }: UserInfoProps) => {
  const displayValue = isContractor && contractorInfo ? 
    `${contractorInfo.companyName || contractorInfo.contactName || value}` : 
    value;

  return (
    <div className="flex items-center">
      <User className="h-4 w-4 text-gray-500 mr-2" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium">{displayValue}</p>
        {isContractor && contractorInfo?.contactName && contractorInfo?.companyName && (
          <p className="text-xs text-gray-400">{contractorInfo.contactName}</p>
        )}
      </div>
    </div>
  );
};
