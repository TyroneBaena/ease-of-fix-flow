
import React from 'react';
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, User, Settings, CheckCircle, AlertCircle, FileText, DollarSign } from 'lucide-react';
import { MaintenanceRequest } from '@/types/maintenance';
import { formatTimestamp } from './detail/utils/dateUtils';
import type { Json } from '@/integrations/supabase/types';

interface ActivityLog {
  id: string;
  request_id: string;
  action_type: string;
  description: string;
  actor_name: string | null;
  actor_role: string | null;
  metadata: Json | null;
  created_at: string;
}

interface ActivityTimelineProps {
  request: MaintenanceRequest;
  comments?: Array<{
    id: string;
    user: string;
    role: string;
    text: string;
    timestamp: string;
  }>;
  activityLogs?: ActivityLog[];
}

export const ActivityTimeline = ({ request, comments = [], activityLogs = [] }: ActivityTimelineProps) => {
  // Generate timeline items from request history and activity logs (excluding comments)
  const generateTimelineItems = () => {
    const items: Array<{
      id: string;
      type: 'status' | 'assignment' | 'creation' | 'update' | 'activity';
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

    // Add activity logs
    activityLogs.forEach((log) => {
      let icon = <Settings className="h-4 w-4 text-gray-500" />;
      let title = 'Activity';
      
      // Set specific icons and titles based on action type
      switch (log.action_type) {
        case 'quote_requested':
        case 'quote_re_requested':
          icon = <FileText className="h-4 w-4 text-blue-500" />;
          title = 'Quote Requested';
          break;
        case 'quote_submitted':
        case 'quote_resubmitted':
        case 'quote_updated':
          icon = <DollarSign className="h-4 w-4 text-green-500" />;
          title = 'Quote Submitted';
          break;
        case 'quote_approved':
          icon = <CheckCircle className="h-4 w-4 text-green-600" />;
          title = 'Quote Approved';
          break;
        case 'contractor_assigned':
          icon = <User className="h-4 w-4 text-green-500" />;
          title = 'Contractor Assigned';
          break;
        default:
          title = 'Activity Update';
      }

      items.push({
        id: `activity-${log.id}`,
        type: 'activity',
        title,
        description: log.description,
        timestamp: log.created_at,
        user: log.actor_name || 'System',
        icon
      });
    });

    // Add contractor assignment if exists (legacy support)
    if (request.contractorId && request.assignedAt) {
      // Check if we already have this from activity logs
      const hasAssignmentLog = activityLogs.some(log => 
        log.action_type === 'contractor_assigned' && 
        new Date(log.created_at).getTime() === new Date(request.assignedAt!).getTime()
      );
      
      if (!hasAssignmentLog) {
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

    // Note: Comments are intentionally excluded from the timeline
    // They are handled separately in the CommentSection component

    // Sort by timestamp (newest first)
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const timelineItems = generateTimelineItems();

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
      case 'activity':
        return 'border-emerald-200 bg-emerald-50';
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
