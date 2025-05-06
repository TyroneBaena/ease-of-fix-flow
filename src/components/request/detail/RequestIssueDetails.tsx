
import React from 'react';
import { Separator } from "@/components/ui/separator";
import { Wrench } from 'lucide-react';

interface RequestIssueDetailsProps {
  issueNature: string;
  explanation: string;
  attemptedFix: string;
}

export const RequestIssueDetails = ({ issueNature, explanation, attemptedFix }: RequestIssueDetailsProps) => {
  return (
    <>
      <Separator className="my-6" />
      
      <div className="mb-6">
        <h2 className="font-semibold mb-3">Issue Nature</h2>
        <p className="text-gray-700">{issueNature}</p>
      </div>
      
      <div className="mb-6">
        <h2 className="font-semibold mb-3">Explanation</h2>
        <p className="text-gray-700 whitespace-pre-line">{explanation}</p>
      </div>
      
      <div className="mb-6">
        <h2 className="font-semibold mb-3 flex items-center">
          <Wrench className="h-4 w-4 mr-2" />
          Attempted Fix
        </h2>
        <p className="text-gray-700 whitespace-pre-line">{attemptedFix}</p>
      </div>
    </>
  );
};
