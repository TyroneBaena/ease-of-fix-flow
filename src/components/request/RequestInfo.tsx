
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Clock, 
  Calendar, 
  MapPin, 
  Tag, 
  Paperclip,
  User,
  CheckCircle,
  Wrench,
  AlertCircle,
} from 'lucide-react';

interface RequestInfoProps {
  request: {
    id: string;
    isParticipantRelated: boolean;
    participantName: string;
    attemptedFix: string;
    issueNature: string;
    explanation: string;
    location: string;
    reportDate: string;
    site: string;
    submittedBy: string;
    status: string;
    createdAt: string;
    assignedTo?: string;
    attachments?: Array<{ url: string }> | null;
  };
}

export const RequestInfo = ({ request }: RequestInfoProps) => {
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

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <div className="flex items-center mb-2">
            <Badge className={`${getStatusColor(request.status)} mr-3`}>
              {request.status === 'open' ? 'Open' : 
               request.status === 'in-progress' ? 'In Progress' : 
               'Completed'}
            </Badge>
            <p className="text-sm text-gray-500 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Submitted {request.createdAt}
            </p>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{request.issueNature}</h1>
        </div>
        <div className="mt-4 sm:mt-0">
          <Badge variant="outline" className="text-blue-600">
            #{request.id.slice(0, 8)}
          </Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="flex items-center">
          <CheckCircle className="h-4 w-4 text-gray-500 mr-2" />
          <div>
            <p className="text-xs text-gray-500">Participant Related</p>
            <p className="font-medium">{request.isParticipantRelated ? 'Yes' : 'No'}</p>
          </div>
        </div>
        {request.participantName && request.participantName !== 'N/A' && (
          <div className="flex items-center">
            <User className="h-4 w-4 text-gray-500 mr-2" />
            <div>
              <p className="text-xs text-gray-500">Participant Name</p>
              <p className="font-medium">{request.participantName}</p>
            </div>
          </div>
        )}
        <div className="flex items-center">
          <MapPin className="h-4 w-4 text-gray-500 mr-2" />
          <div>
            <p className="text-xs text-gray-500">Location</p>
            <p className="font-medium">{request.location}</p>
          </div>
        </div>
        <div className="flex items-center">
          <Calendar className="h-4 w-4 text-gray-500 mr-2" />
          <div>
            <p className="text-xs text-gray-500">Report Date</p>
            <p className="font-medium">{request.reportDate}</p>
          </div>
        </div>
        <div className="flex items-center">
          <Tag className="h-4 w-4 text-gray-500 mr-2" />
          <div>
            <p className="text-xs text-gray-500">Site</p>
            <p className="font-medium">{request.site}</p>
          </div>
        </div>
        <div className="flex items-center">
          <User className="h-4 w-4 text-gray-500 mr-2" />
          <div>
            <p className="text-xs text-gray-500">Submitted By</p>
            <p className="font-medium">{request.submittedBy}</p>
          </div>
        </div>
        <div className="flex items-center">
          <User className="h-4 w-4 text-gray-500 mr-2" />
          <div>
            <p className="text-xs text-gray-500">Assigned To</p>
            <p className="font-medium">{request.assignedTo || 'Unassigned'}</p>
          </div>
        </div>
      </div>
      
      <Separator className="my-6" />
      
      <div className="mb-6">
        <h2 className="font-semibold mb-3">Issue Nature</h2>
        <p className="text-gray-700">{request.issueNature}</p>
      </div>
      
      <div className="mb-6">
        <h2 className="font-semibold mb-3">Explanation</h2>
        <p className="text-gray-700 whitespace-pre-line">{request.explanation}</p>
      </div>
      
      <div className="mb-6">
        <h2 className="font-semibold mb-3 flex items-center">
          <Wrench className="h-4 w-4 mr-2" />
          Attempted Fix
        </h2>
        <p className="text-gray-700 whitespace-pre-line">{request.attemptedFix}</p>
      </div>
      
      {request.attachments && request.attachments.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold mb-3 flex items-center">
            <Paperclip className="h-4 w-4 mr-2" />
            Attachments ({request.attachments.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {request.attachments.map((attachment, index) => (
              <div key={index} className="rounded-lg overflow-hidden border bg-gray-50">
                <img 
                  src={attachment.url} 
                  alt={`Attachment ${index + 1}`}
                  className="w-full h-full object-contain aspect-square"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
