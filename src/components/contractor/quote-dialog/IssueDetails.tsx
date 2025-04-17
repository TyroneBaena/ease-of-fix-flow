
import React from 'react';
import { MapPin, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { QuoteDialogSkeleton } from './QuoteDialogSkeleton';

interface IssueDetailsProps {
  location?: string;
  priority?: string;
  description?: string;
  isLoading?: boolean;
}

const getPriorityColor = (priority?: string) => {
  switch (priority?.toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-800 hover:bg-red-100';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
    case 'low':
      return 'bg-green-100 text-green-800 hover:bg-green-100';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
  }
};

export const IssueDetails: React.FC<IssueDetailsProps> = ({
  location,
  priority,
  description,
  isLoading
}) => {
  if (isLoading) return <QuoteDialogSkeleton />;

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
            <Badge variant="outline" className={`mt-1 ${getPriorityColor(priority)}`}>
              {priority || 'N/A'}
            </Badge>
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
