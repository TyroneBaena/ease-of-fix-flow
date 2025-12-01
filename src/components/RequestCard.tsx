import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Clock, 
  MapPin, 
  Calendar, 
  User,
  ChevronRight,
  Building2
} from 'lucide-react';
import { MaintenanceRequest } from '@/types/maintenance';

interface RequestCardProps {
  request: MaintenanceRequest;
  onClick: () => void;
  propertyName?: string;
}

// Custom comparison function to prevent unnecessary re-renders
const arePropsEqual = (prevProps: RequestCardProps, nextProps: RequestCardProps) => {
  // Compare request properties that affect rendering
  const prevRequest = prevProps.request;
  const nextRequest = nextProps.request;
  
  return (
    prevRequest.id === nextRequest.id &&
    prevRequest.status === nextRequest.status &&
    prevRequest.issueNature === nextRequest.issueNature &&
    prevRequest.title === nextRequest.title &&
    prevRequest.explanation === nextRequest.explanation &&
    prevRequest.description === nextRequest.description &&
    prevRequest.site === nextRequest.site &&
    prevRequest.category === nextRequest.category &&
    prevRequest.reportDate === nextRequest.reportDate &&
    prevRequest.createdAt === nextRequest.createdAt &&
    prevRequest.location === nextRequest.location &&
    prevRequest.dueDate === nextRequest.dueDate &&
    prevRequest.assignedTo === nextRequest.assignedTo &&
    prevRequest.propertyId === nextRequest.propertyId &&
    prevProps.propertyName === nextProps.propertyName &&
    prevProps.onClick === nextProps.onClick
  );
};

const RequestCard: React.FC<RequestCardProps> = ({ request, onClick, propertyName }) => {
  // Debug logging to track renders
  console.log(`🎨 RequestCard re-rendered for request: ${request.id?.substring(0, 8)}`);
  
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
  
  // Keep the getPriorityColor function for future use but remove its usage
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

  // Get display title - prioritize title field over issueNature
  const displayTitle = request.title || request.issueNature || 'Untitled Request';
  
  // Get display description (either explanation or description)
  const displayDescription = request.explanation || request.description || '';
  
  // Get display category (site or category)
  const displayCategory = request.site || request.category;

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
              {/* Priority badge removed */}
            </div>
            <h3 className="font-semibold text-lg">{displayTitle}</h3>
            <p className="text-muted-foreground line-clamp-2">{displayDescription}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
        
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-2 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            <span>{request.reportDate || request.createdAt}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="h-3.5 w-3.5 mr-1.5" />
            <span className="truncate">{request.location}</span>
          </div>
          {propertyName && (
            <div className="flex items-center">
              <Building2 className="h-3.5 w-3.5 mr-1.5" />
              <span className="truncate">{propertyName}</span>
            </div>
          )}
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

export default React.memo(RequestCard, arePropsEqual);
