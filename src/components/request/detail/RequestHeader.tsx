
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Clock } from 'lucide-react';
import { getStatusColor, getStatusDisplay } from './utils/statusUtils';
import { formatTimestamp } from './utils/dateUtils';

interface RequestHeaderProps {
  id: string;
  status: string;
  priority?: string;
  createdAt: string;
  title: string;
}

const getPriorityColor = (priority: string): string => {
  switch (priority?.toLowerCase()) {
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getPriorityDisplay = (priority: string): string => {
  if (!priority) return 'Medium';
  return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
};

export const RequestHeader = ({ id, status, priority, createdAt, title }: RequestHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <div className="flex items-center flex-wrap gap-2 mb-2">
          <Badge className={`${getStatusColor(status)} hover:${getStatusColor(status).split(' ').find(c => c.startsWith('bg-'))}`}>
            {getStatusDisplay(status)}
          </Badge>
          <Badge className={getPriorityColor(priority || 'medium')}>
            {getPriorityDisplay(priority || 'medium')} Priority
          </Badge>
          <p className="text-sm text-gray-500 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Submitted {formatTimestamp(createdAt)}
          </p>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      </div>
      <div className="mt-4 sm:mt-0">
        <Badge variant="outline" className="text-blue-600">
          Request #{id.slice(0, 8)}
        </Badge>
      </div>
    </div>
  );
};
