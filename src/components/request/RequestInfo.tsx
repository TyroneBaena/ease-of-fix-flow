
import React from 'react';
import { Card } from "@/components/ui/card";
import { RequestHeader } from './detail/RequestHeader';
import { RequestMetadata } from './detail/RequestMetadata';
import { RequestIssueDetails } from './detail/RequestIssueDetails';
import { RequestAttachments } from './detail/RequestAttachments';
import { usePropertyContext } from '@/contexts/property/PropertyContext';

interface RequestInfoProps {
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
    site: string;
    submittedBy: string;
    status: string;
    priority?: string;
    createdAt: string;
    assignedTo?: string;
    contractorId?: string;
    propertyId?: string;
    assignedToLandlord?: boolean;
    attachments?: Array<{ url: string; name?: string; type?: string }> | null;
  };
  onAttachmentsAdded?: () => void;
  canEdit?: boolean;
}

export const RequestInfo = ({ request, onAttachmentsAdded, canEdit = false }: RequestInfoProps) => {
  const { getProperty } = usePropertyContext();
  const propertyName = request.propertyId ? getProperty(request.propertyId)?.name : undefined;
  
  return (
    <Card className="p-6">
      <RequestHeader 
        id={request.id} 
        status={request.status}
        priority={request.priority}
        createdAt={request.createdAt}
        title={request.title}
        assignedToLandlord={request.assignedToLandlord}
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
        propertyId={request.propertyId}
        propertyName={propertyName}
        assignedToLandlord={request.assignedToLandlord}
      />
      
      <RequestIssueDetails 
        issueNature={request.issueNature}
        explanation={request.explanation}
        attemptedFix={request.attemptedFix}
      />
      
      <RequestAttachments 
        attachments={request.attachments}
        requestId={request.id}
        onAttachmentsAdded={onAttachmentsAdded}
        canEdit={canEdit}
      />
    </Card>
  );
};
