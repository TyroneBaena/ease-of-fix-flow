
import React from 'react';
import { Card } from "@/components/ui/card";
import { RequestHeader } from './detail/RequestHeader';
import { RequestMetadata } from './detail/RequestMetadata';
import { RequestIssueDetails } from './detail/RequestIssueDetails';
import { RequestAttachments } from './detail/RequestAttachments';

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
    contractorId?: string;
    attachments?: Array<{ url: string; name?: string; type?: string }> | null;
  };
}

export const RequestInfo = ({ request }: RequestInfoProps) => {
  console.log('RequestInfo - COMPONENT START');
  console.log('RequestInfo - full request object:', request);
  console.log('RequestInfo - attachments specifically:', request.attachments);
  console.log('RequestInfo - attachments type:', typeof request.attachments);
  console.log('RequestInfo - attachments is array?', Array.isArray(request.attachments));
  console.log('RequestInfo - attachments length:', request.attachments?.length);
  console.log('RequestInfo - ABOUT TO PASS TO RequestAttachments');
  
  return (
    <Card className="p-6">
      <RequestHeader 
        id={request.id} 
        status={request.status} 
        createdAt={request.createdAt}
        issueNature={request.issueNature}
      />
      
      <RequestMetadata 
        isParticipantRelated={request.isParticipantRelated}
        participantName={request.participantName}
        location={request.location}
        reportDate={request.reportDate}
        site={request.site}
        submittedBy={request.submittedBy}
        assignedTo={request.assignedTo}
        contractorId={request.contractorId}
      />
      
      <RequestIssueDetails 
        issueNature={request.issueNature}
        explanation={request.explanation}
        attemptedFix={request.attemptedFix}
      />
      
      <RequestAttachments attachments={request.attachments} />
    </Card>
  );
};
