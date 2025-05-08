
import React from 'react';
import { MaintenanceRequest } from '@/types/maintenance';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface IssueDetailsCardProps {
  job: MaintenanceRequest;
}

export const IssueDetailsCard = ({ job }: IssueDetailsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Issue Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Description</h3>
          <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{job.description}</p>
        </div>
        
        {job.explanation && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Explanation</h3>
            <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{job.explanation}</p>
          </div>
        )}
        
        {job.attemptedFix && (
          <div>
            <h3 className="text-sm font-medium text-gray-500">Attempted Fix</h3>
            <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{job.attemptedFix}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
