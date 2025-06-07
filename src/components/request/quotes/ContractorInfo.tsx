
import React from 'react';
import { Building2, User, Phone } from 'lucide-react';

interface ContractorInfoData {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
}

interface ContractorInfoProps {
  contractor: ContractorInfoData | undefined;
  loading: boolean;
}

export const ContractorInfo = ({ contractor, loading }: ContractorInfoProps) => {
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="text-sm text-gray-500">
        Contractor information unavailable
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-blue-600" />
        <span className="font-semibold text-gray-900">{contractor.companyName}</span>
      </div>
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" />
          <span>{contractor.contactName}</span>
        </div>
        <div className="flex items-center gap-1">
          <Phone className="h-3 w-3" />
          <span>{contractor.phone}</span>
        </div>
      </div>
    </div>
  );
};
