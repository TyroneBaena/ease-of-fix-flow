
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MaintenanceRequest } from '@/types/maintenance';
import { formatDistanceToNow } from 'date-fns';
import { Eye, User, Clock } from 'lucide-react';

interface RequestsListProps {
  allRequests: MaintenanceRequest[];
  onRequestSelect?: (request: MaintenanceRequest) => void;
  selectedRequest?: MaintenanceRequest | null;
}

const RequestsList = ({ allRequests, onRequestSelect, selectedRequest }: RequestsListProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
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
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-orange-100 text-orange-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Show recent requests (limit to 10 for better UI)
  const recentRequests = allRequests
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recent Maintenance Requests</span>
          <span className="text-sm font-normal text-gray-500">
            {allRequests.length} total requests
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentRequests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No maintenance requests found</p>
            <p className="text-sm mt-1">Submit your first request to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentRequests.map((request) => (
              <div 
                key={request.id} 
                className={`p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${
                  selectedRequest?.id === request.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => onRequestSelect?.(request)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-gray-900 truncate">
                        {request.title}
                      </h3>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                      {request.priority && (
                        <Badge variant="outline" className={getPriorityColor(request.priority)}>
                          {request.priority}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {request.description || request.explanation}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                      </span>
                      
                      <span>{request.location}</span>
                      
                      {request.assignedTo && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {request.assignedTo}
                        </span>
                      )}
                    </div>
                    
                    {(request.contractorId || request.completionPercentage > 0) && (
                      <div className="mt-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Progress:</span>
                          <span className="font-medium">{request.completionPercentage || 0}%</span>
                          <div className="w-16 h-1 bg-gray-200 rounded-full">
                            <div 
                              className="h-1 bg-blue-500 rounded-full transition-all"
                              style={{ width: `${request.completionPercentage || 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4 flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/requests/${request.id}`, '_blank');
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
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
