
import React from 'react';
import { MaintenanceRequest } from '@/types/maintenance';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Building, User, Clock, DollarSign, Percent } from 'lucide-react';

interface JobDetailsCardProps {
  job: MaintenanceRequest;
}

export const JobDetailsCard = ({ job }: JobDetailsCardProps) => {
  
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'low':
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">Low Priority</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">Medium Priority</Badge>;
      case 'high':
        return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">High Priority</Badge>;
      default:
        return <Badge variant="outline" className="hover:bg-transparent">{priority}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">Pending</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">Completed</Badge>;
      case 'open':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100">Open</Badge>;
      default:
        return <Badge variant="outline" className="hover:bg-transparent">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Job Details</span>
          <div className="flex gap-2">
            {getStatusBadge(job.status)}
            {getPriorityBadge(job.priority || 'medium')}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Building className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Job ID</p>
                  <p className="text-sm text-gray-900 font-mono">{job.id.slice(0, 8)}...</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Location</p>
                  <p className="text-sm text-gray-900">{job.location || 'Not specified'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Building className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Site/Category</p>
                  <p className="text-sm text-gray-900">{job.site || job.category || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Submitted By</p>
                  <p className="text-sm text-gray-900">{job.submittedBy || 'Unknown'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <CalendarDays className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Created</p>
                  <p className="text-sm text-gray-900">{formatDate(job.createdAt)}</p>
                </div>
              </div>

              {job.assignedTo && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                    <User className="h-4 w-4 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Assigned To</p>
                    <p className="text-sm text-gray-900">{job.assignedTo}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Financial & Progress Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Quoted Amount</p>
                <p className="text-sm text-gray-900 font-semibold">
                  {job.quotedAmount ? `$${job.quotedAmount.toLocaleString()}` : 'Not quoted'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Percent className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Completion</p>
                <p className="text-sm text-gray-900 font-semibold">
                  {job.completionPercentage || 0}%
                </p>
              </div>
            </div>

            {job.assignedAt && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Assigned</p>
                  <p className="text-sm text-gray-900">{formatDate(job.assignedAt)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Additional Information */}
          {(job.dueDate || job.propertyId) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              {job.dueDate && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Due Date</p>
                  <p className="text-sm text-gray-900">{formatDate(job.dueDate)}</p>
                </div>
              )}
              
              {job.propertyId && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Property ID</p>
                  <p className="text-sm text-gray-900 font-mono">{job.propertyId.slice(0, 8)}...</p>
                </div>
              )}
            </div>
          )}

          {/* Participant Information */}
          {job.isParticipantRelated && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Participant Information</h4>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm">
                  <span className="font-medium">Participant:</span> {job.participantName || 'N/A'}
                </p>
                {job.reportDate && (
                  <p className="text-sm mt-1">
                    <span className="font-medium">Report Date:</span> {job.reportDate}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
