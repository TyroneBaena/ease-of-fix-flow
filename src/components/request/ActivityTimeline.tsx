
import React from 'react';
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, User, Settings, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { MaintenanceRequest } from '@/types/maintenance';

interface ActivityTimelineProps {
  request: MaintenanceRequest;
  comments?: Array<{
    id: string;
    user: string;
    role: string;
    text: string;
    timestamp: string;
  }>;
}

export const ActivityTimeline = ({ request, comments = [] }: ActivityTimelineProps) => {
  // Generate timeline items from request history and comments
  const generateTimelineItems = () => {
    const items: Array<{
      id: string;
      type: 'status' | 'assignment' | 'comment' | 'creation' | 'update';
      title: string;
      description: string;
      timestamp: string;
      user: string;
      icon: React.ReactNode;
    }> = [];

    // Add creation event
    items.push({
      id: `creation-${request.id}`,
      type: 'creation',
      title: 'Request Created',
      description: `Maintenance request created for ${request.location}`,
      timestamp: request.createdAt,
      user: request.submittedBy || 'System',
      icon: <AlertCircle className="h-4 w-4 text-blue-500" />
    });

    // Add history events if they exist
    if (request.history && Array.isArray(request.history)) {
      request.history.forEach((event, index) => {
        items.push({
          id: `history-${index}`,
          type: 'update',
          title: 'Status Update',
          description: event.action,
          timestamp: event.timestamp,
          user: 'System',
          icon: <Settings className="h-4 w-4 text-gray-500" />
        });
      });
    }

    // Add contractor assignment if exists
    if (request.contractorId && request.assignedAt) {
      items.push({
        id: `assignment-${request.contractorId}`,
        type: 'assignment',
        title: 'Contractor Assigned',
        description: `Request assigned to contractor`,
        timestamp: request.assignedAt,
        user: 'System',
        icon: <User className="h-4 w-4 text-green-500" />
      });
    }

    // Add completion event if completed
    if (request.status === 'completed') {
      items.push({
        id: `completion-${request.id}`,
        type: 'status',
        title: 'Request Completed',
        description: 'Maintenance request marked as completed',
        timestamp: request.updatedAt || request.createdAt,
        user: 'System',
        icon: <CheckCircle className="h-4 w-4 text-green-600" />
      });
    }

    // Add comments
    comments.forEach((comment) => {
      items.push({
        id: `comment-${comment.id}`,
        type: 'comment',
        title: 'Comment Added',
        description: comment.text.length > 100 ? `${comment.text.substring(0, 100)}...` : comment.text,
        timestamp: comment.timestamp,
        user: comment.user,
        icon: <MessageSquare className="h-4 w-4 text-blue-500" />
      });
    });

    // Sort by timestamp (newest first)
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const timelineItems = generateTimelineItems();

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else if (diffDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getInitials = (name: string): string => {
    if (!name) return '?';
    
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'creation':
        return 'border-blue-200 bg-blue-50';
      case 'assignment':
        return 'border-green-200 bg-green-50';
      case 'status':
        return 'border-purple-200 bg-purple-50';
      case 'comment':
        return 'border-orange-200 bg-orange-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  if (timelineItems.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="font-semibold mb-4 flex items-center">
          <Clock className="h-4 w-4 mr-2" />
          Activity Timeline
        </h2>
        <p className="text-gray-500 text-sm text-center py-8">No activity recorded yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="font-semibold mb-6 flex items-center">
        <Clock className="h-4 w-4 mr-2" />
        Activity Timeline
      </h2>
      
      <div className="space-y-4">
        {timelineItems.map((item, index) => (
          <div key={item.id} className="flex items-start space-x-4">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${getTypeColor(item.type)}`}>
                {item.icon}
              </div>
              {index < timelineItems.length - 1 && (
                <div className="w-0.5 h-8 bg-gray-200 mt-2"></div>
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="font-medium text-sm">{item.title}</h3>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src="" alt={item.user} />
                    <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-medium">
                      {getInitials(item.user)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-gray-500">{item.user}</span>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {formatTimestamp(item.timestamp)}
                </span>
              </div>
              <p className="text-sm text-gray-700 mt-1">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
