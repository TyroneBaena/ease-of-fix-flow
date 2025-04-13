
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

interface Request {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  location: string;
  createdAt: string;
  dueDate?: string;
  assignedTo?: string;
  attachments?: Array<{ url: string }>;
  history?: Array<{ action: string; timestamp: string }>;
}

interface RequestCardProps {
  request: Request;
  onClick: () => void;
}

const RequestCard: React.FC<RequestCardProps> = ({ request, onClick }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-amber-100 text-amber-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getPriorityColor = (priority: string) => {
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
                {request.status === 'open' ? 'Open' : 
                 request.status === 'in-progress' ? 'In Progress' : 
                 'Completed'}
              </Badge>
              <Badge variant="outline" className={getPriorityColor(request.priority)}>
                {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)} Priority
              </Badge>
            </div>
            <h3 className="font-semibold text-lg">{request.title}</h3>
            <p className="text-gray-600 line-clamp-2">{request.description}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </div>
        
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-2 text-sm text-gray-500">
          <div className="flex items-center">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            <span>{request.createdAt}</span>
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
