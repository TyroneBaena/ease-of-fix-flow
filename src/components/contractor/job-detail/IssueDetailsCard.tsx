
import React from 'react';
import { MaintenanceRequest } from '@/types/maintenance';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle, FileText, Wrench } from 'lucide-react';

interface IssueDetailsCardProps {
  job: MaintenanceRequest;
}

export const IssueDetailsCard = ({ job }: IssueDetailsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          Issue Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Issue Nature */}
        {job.issueNature && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-3 w-3 text-red-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Issue Nature</h3>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{job.issueNature}</p>
            </div>
          </div>
        )}

        {/* Description */}
        {job.description && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-3 w-3 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Description</h3>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{job.description}</p>
            </div>
          </div>
        )}
        
        {/* Detailed Explanation */}
        {job.explanation && job.explanation !== job.description && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                <FileText className="h-3 w-3 text-purple-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Detailed Explanation</h3>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{job.explanation}</p>
            </div>
          </div>
        )}
        
        {/* Attempted Fix */}
        {job.attemptedFix && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                <Wrench className="h-3 w-3 text-orange-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Attempted Fix</h3>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{job.attemptedFix}</p>
            </div>
          </div>
        )}

        {/* Show a message if no detailed information is available */}
        {!job.issueNature && !job.description && !job.explanation && !job.attemptedFix && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No detailed issue information available</p>
            <p className="text-sm">Additional details may be added as the job progresses</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
