
import React from 'react';
import { MapPin, Clock } from 'lucide-react';

interface IssueDetailsProps {
  location?: string;
  priority?: string;
  description?: string;
}

const getPriorityColor = (priority?: string) => {
  switch (priority?.toLowerCase()) {
    case 'high':
      return 'text-red-500';
    case 'medium':
      return 'text-yellow-500';
    case 'low':
      return 'text-green-500';
    default:
      return 'text-gray-500';
  }
};

export const IssueDetails: React.FC<IssueDetailsProps> = ({
  location,
  priority,
  description,
}) => {
  return (
    <div className="space-y-6">
      <h3 className="font-semibold">Issue Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 mt-1 text-gray-500" />
          <div>
            <p className="text-sm font-medium">Location</p>
            <p className="text-sm text-gray-600">{location || 'N/A'}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Clock className={`h-4 w-4 mt-1 ${getPriorityColor(priority)}`} />
          <div>
            <p className="text-sm font-medium">Priority Level</p>
            <p className="text-sm text-gray-600">{priority || 'N/A'}</p>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Description</p>
        <p className="text-sm text-gray-600 whitespace-pre-line">
          {description || 'No description provided'}
        </p>
      </div>
    </div>
  );
};
