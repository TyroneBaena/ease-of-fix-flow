
import React from 'react';
import { MaintenanceRequest } from '@/types/maintenance';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface JobDetailsCardProps {
  job: MaintenanceRequest;
}

export const JobDetailsCard = ({ job }: JobDetailsCardProps) => {
  
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'low':
        return <span className="inline-block px-2 py-1 text-xs font-medium rounded-full border border-green-500 text-green-700">Low</span>;
      case 'medium':
        return <span className="inline-block px-2 py-1 text-xs font-medium rounded-full border border-yellow-500 text-yellow-700">Medium</span>;
      case 'high':
        return <span className="inline-block px-2 py-1 text-xs font-medium rounded-full border border-red-500 text-red-700">High</span>;
      default:
        return <span className="inline-block px-2 py-1 text-xs font-medium rounded-full border">{priority}</span>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Details</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Job ID</dt>
            <dd className="mt-1 text-sm text-gray-900 font-mono">{job.id}</dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500">Priority</dt>
            <dd className="mt-1">{getPriorityBadge(job.priority || 'medium')}</dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500">Location</dt>
            <dd className="mt-1 text-sm text-gray-900">{job.location}</dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500">Site</dt>
            <dd className="mt-1 text-sm text-gray-900">{job.site || job.category || 'N/A'}</dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500">Submitted By</dt>
            <dd className="mt-1 text-sm text-gray-900">{job.submittedBy}</dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500">Submission Date</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'N/A'}
            </dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500">Quoted Amount</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {job.quotedAmount ? `$${job.quotedAmount}` : 'Not quoted'}
            </dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500">Completion</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {job.completionPercentage || 0}%
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
};
