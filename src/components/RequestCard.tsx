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
import { getDisplayStatus, getDisplayStatusColor } from '@/utils/statusDisplayUtils';

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
    prevRequest.assigned_to_landlord === nextRequest.assigned_to_landlord &&
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
      <CardContent className="p-3">
        <div className="flex justify-between items-start">
          <div className="space-y-0.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge className={`${getDisplayStatusColor(getDisplayStatus(request.status, request.assigned_to_landlord))} text-xs`}>
                {getDisplayStatus(request.status, request.assigned_to_landlord)}
              </Badge>
              <h3 className="font-semibold text-sm truncate">{displayTitle}</h3>
            </div>
            <p className="text-muted-foreground text-xs line-clamp-1">{displayDescription}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
        </div>
        
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            <span className="truncate">{request.reportDate || request.createdAt}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="h-3 w-3 mr-1" />
            <span className="truncate">{request.location}</span>
          </div>
          {propertyName && (
            <div className="flex items-center">
              <Building2 className="h-3 w-3 mr-1" />
              <span className="truncate">{propertyName}</span>
            </div>
          )}
          {request.dueDate && (
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              <span className="truncate">{request.dueDate}</span>
            </div>
          )}
          {request.assignedTo && (
            <div className="flex items-center">
              <User className="h-3 w-3 mr-1" />
              <span className="truncate">{request.assignedTo}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(RequestCard, arePropsEqual);
