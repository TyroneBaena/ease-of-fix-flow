import React from 'react';
import { Card } from "@/components/ui/card";
import { RequestHeader } from './detail/RequestHeader';
import { RequestIssueDetails } from './detail/RequestIssueDetails';
import { RequestAttachments } from './detail/RequestAttachments';
import { PublicRequestMetadata } from './detail/PublicRequestMetadata';

interface PublicRequestInfoProps {
  request: {
    id: string;
    title: string;
    isParticipantRelated: boolean;
    participantName: string;
    attemptedFix: string;
    issueNature: string;
    explanation: string;
    location: string;
    reportDate: string;
    submittedBy: string;
    status: string;
    priority?: string;
    createdAt: string;
    assignedTo?: string;
    contractorId?: string;
    propertyId?: string;
    assignedToLandlord?: boolean;
    aiIssueType?: string | null;
    attachments?: Array<{ url: string; name?: string; type?: string }> | null;
  };
  propertyName?: string;
  contractorInfo?: {
    companyName?: string;
    contactName?: string;
  } | null;
}

/**
 * Public version of RequestInfo that doesn't rely on usePropertyContext
 * Used for QR code public access pages
 */
export const PublicRequestInfo = ({ request, propertyName, contractorInfo }: PublicRequestInfoProps) => {
  return (
    <Card className="p-6">
      <RequestHeader 
        id={request.id} 
        status={request.status}
        priority={request.priority}
        createdAt={request.createdAt}
        title={request.title}
      />
      
      <PublicRequestMetadata 
        isParticipantRelated={request.isParticipantRelated}
        participantName={request.participantName}
        location={request.location}
        reportDate={request.reportDate}
        submittedBy={request.submittedBy}
        assignedTo={request.assignedTo}
        contractorId={request.contractorId}
        propertyId={request.propertyId}
        propertyName={propertyName}
        assignedToLandlord={request.assignedToLandlord}
        aiIssueType={request.aiIssueType}
        contractorInfo={contractorInfo}
      />
      
      <RequestIssueDetails 
        issueNature={request.issueNature}
        explanation={request.explanation}
        attemptedFix={request.attemptedFix}
      />
      
      <RequestAttachments 
        attachments={request.attachments}
        requestId={request.id}
        canEdit={false}
      />
    </Card>
  );
};
