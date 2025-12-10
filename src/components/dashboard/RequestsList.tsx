
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MaintenanceRequest } from '@/types/maintenance';
import { formatDistanceToNow } from 'date-fns';
import { User, Clock, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePropertyContext } from '@/contexts/property/PropertyContext';
import { getDisplayStatus, getDisplayStatusColor } from '@/utils/statusDisplayUtils';

interface RequestsListProps {
  allRequests: MaintenanceRequest[];
  onRequestSelect?: (request: MaintenanceRequest) => void;
  selectedRequest?: MaintenanceRequest | null;
}

const RequestsList = ({ allRequests, onRequestSelect, selectedRequest }: RequestsListProps) => {
  const navigate = useNavigate();
  const { properties } = usePropertyContext();

  // Create property lookup map for efficiency
  const propertyMap = useMemo(() => 
    new Map(properties.map(p => [p.id, p.name])), 
    [properties]
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      case 'medium':
        return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
      case 'low':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  // Show recent requests (limit to 10 for better UI), excluding cancelled ones
  const recentRequests = allRequests
    .filter(req => req.status !== 'cancelled')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const handleRequestClick = (request: MaintenanceRequest) => {
    // Use in-app routing instead of opening new tabs
    navigate(`/requests/${request.id}`);
    // Also trigger the onRequestSelect if provided for sidebar functionality
    onRequestSelect?.(request);
  };

  const formatCreatedDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recent Maintenance Requests</span>
          <span className="text-sm font-normal text-muted-foreground">
            {allRequests.length} total requests
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentRequests.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p>No maintenance requests found</p>
            <p className="text-sm mt-1">Submit your first request to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentRequests.map((request) => (
              <div 
                key={request.id} 
                className={`p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedRequest?.id === request.id ? 'ring-2 ring-primary bg-primary/5' : ''
                }`}
                onClick={() => handleRequestClick(request)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge className={`${getDisplayStatusColor(getDisplayStatus(request.status, request.assigned_to_landlord))} text-xs`}>
                        {getDisplayStatus(request.status, request.assigned_to_landlord)}
                      </Badge>
                      {request.priority && (
                        <Badge variant="outline" className={`${getPriorityColor(request.priority)} text-xs`}>
                          {request.priority}
                        </Badge>
                      )}
                      <h3 className="font-medium text-sm text-foreground truncate">
                        {request.title}
                      </h3>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-1 line-clamp-1">
                      {request.description || request.explanation}
                    </p>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatCreatedDate(request.createdAt)}
                      </span>
                      
                      <span className="truncate">{request.location}</span>
                      
                      {request.propertyId && propertyMap.get(request.propertyId) && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          <span className="truncate">{propertyMap.get(request.propertyId)}</span>
                        </span>
                      )}
                      
                      {request.assignedTo && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="truncate">{request.assignedTo}</span>
                        </span>
                      )}
                      
                      {(request.contractorId || request.completionPercentage > 0) && (
                        <span className="flex items-center gap-1">
                          <span>{request.completionPercentage || 0}%</span>
                          <div className="w-12 h-1 bg-muted rounded-full">
                            <div 
                              className="h-1 bg-primary rounded-full transition-all"
                              style={{ width: `${request.completionPercentage || 0}%` }}
                            />
                          </div>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RequestsList;
