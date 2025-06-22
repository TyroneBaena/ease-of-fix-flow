
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Clock } from 'lucide-react';
import { getStatusColor, getStatusDisplay } from './utils/statusUtils';
import { formatTimestamp } from './utils/dateUtils';

interface RequestHeaderProps {
  id: string;
  status: string;
  createdAt: string;
  issueNature: string;
}

export const RequestHeader = ({ id, status, createdAt, issueNature }: RequestHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <div className="flex items-center mb-2">
          <Badge className={`${getStatusColor(status)} hover:${getStatusColor(status).split(' ').find(c => c.startsWith('bg-'))} mr-3`}>
            {getStatusDisplay(status)}
          </Badge>
          <p className="text-sm text-gray-500 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Submitted {formatTimestamp(createdAt)}
          </p>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{issueNature}</h1>
      </div>
      <div className="mt-4 sm:mt-0">
        <Badge variant="outline" className="text-blue-600">
          Request #{id.slice(0, 8)}
        </Badge>
      </div>
    </div>
  );
};
