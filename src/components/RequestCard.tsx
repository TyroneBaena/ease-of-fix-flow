
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Clock, 
  MapPin, 
  Calendar, 
  User,
  ChevronRight
} from 'lucide-react';
import { MaintenanceRequest } from '@/types/maintenance';

interface RequestCardProps {
  request: MaintenanceRequest;
  onClick: () => void;
}

const RequestCard: React.FC<RequestCardProps> = ({ request, onClick }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
      case 'pending':
        return 'bg-amber-100 text-amber-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'open':
        return 'Open';
      case 'pending':
        return 'Pending';
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };
  
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'low':
        return 'bg-gray-100 text-gray-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      case 'high':
        return 'bg-amber-100 text-amber-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get display title (either issueNature or title)
  const displayTitle = request.issueNature || request.title || 'Untitled Request';
  
  // Get display description (either explanation or description)
  const displayDescription = request.explanation || request.description || '';
  
  // Get display category (site or category)
  const displayCategory = request.site || request.category;
  
  // Get display priority (or default to medium)
  const displayPriority = request.priority || 'medium';

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={getStatusColor(request.status)}>
                {getStatusDisplay(request.status)}
              </Badge>
              {displayPriority && (
                <Badge variant="outline" className={getPriorityColor(displayPriority)}>
                  {displayPriority.charAt(0).toUpperCase() + displayPriority.slice(1)} Priority
                </Badge>
              )}
            </div>
            <h3 className="font-semibold text-lg">{displayTitle}</h3>
            <p className="text-gray-600 line-clamp-2">{displayDescription}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
        
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-2 text-sm text-gray-500">
          <div className="flex items-center">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            <span>{request.reportDate || request.createdAt}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="h-3.5 w-3.5 mr-1.5" />
            <span className="truncate">{request.location}</span>
          </div>
          {request.dueDate && (
            <div className="flex items-center">
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              <span>{request.dueDate}</span>
            </div>
          )}
          {request.assignedTo && (
            <div className="flex items-center">
              <User className="h-3.5 w-3.5 mr-1.5" />
              <span className="truncate">{request.assignedTo}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RequestCard;
