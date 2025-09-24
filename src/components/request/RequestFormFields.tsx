
import React from 'react';
import { Property } from '@/types/property';
import { RequestFormProperty } from "./RequestFormProperty";
import { RequestFormAttachments } from "./RequestFormAttachments";
import { CategorySelectionField } from "./CategorySelectionField";
import { ParticipantRelatedField } from './ParticipantRelatedField';
import { ParticipantNameField } from './ParticipantNameField';
import { AttemptedFixField } from './AttemptedFixField';
import { IssueNatureField } from './IssueNatureField';
import { ExplanationField } from './ExplanationField';
import { LocationField } from './LocationField';
import { ReportDateField } from './ReportDateField';
import { SubmittedByField } from './SubmittedByField';

interface FormState {
  propertyId: string;
  isParticipantRelated: boolean;
  participantName: string;
  attemptedFix: string;
  issueNature: string;
  explanation: string;
  location: string;
  reportDate: string;
  submittedBy: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical' | '';
  budgetCategoryId: string;
}

interface RequestFormFieldsProps {
  formState: FormState;
  updateFormState: (field: keyof FormState, value: any) => void;
  properties: Property[];
  files: File[];
  previewUrls: string[];
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: (index: number) => void;
  isUploading: boolean;
  showPhotoError?: boolean;
  propertyId?: string; // For public access via QR code
}

export const RequestFormFields: React.FC<RequestFormFieldsProps> = ({
  formState,
  updateFormState,
  properties,
  files,
  previewUrls,
  handleFileChange,
  removeFile,
  isUploading,
  showPhotoError = false,
  propertyId
}) => {
  return (
    <>
      <RequestFormProperty 
        value={formState.propertyId}
        onChange={(value) => updateFormState('propertyId', value)}
        properties={properties}
      />
      
      <CategorySelectionField
        category={formState.budgetCategoryId || ''}
        priority={formState.priority || ''}
        onCategoryChange={(value) => updateFormState('budgetCategoryId', value)}
        onPriorityChange={(value) => updateFormState('priority', value)}
      />
      
      <ParticipantRelatedField
        value={formState.isParticipantRelated || false}
        onChange={(value) => updateFormState('isParticipantRelated', value)}
      />
      
      <ParticipantNameField
        value={formState.participantName || ''}
        onChange={(value) => updateFormState('participantName', value)}
        isParticipantRelated={formState.isParticipantRelated || false}
      />
      
      <AttemptedFixField
        value={formState.attemptedFix || ''}
        onChange={(value) => updateFormState('attemptedFix', value)}
      />
      
      <RequestFormAttachments
        files={files}
        previewUrls={previewUrls}
        onFileChange={handleFileChange}
        onRemoveFile={removeFile}
        isUploading={isUploading}
        showError={showPhotoError}
      />
      
      <IssueNatureField
        value={formState.issueNature || ''}
        onChange={(value) => updateFormState('issueNature', value)}
      />
      
      <ExplanationField
        value={formState.explanation || ''}
        onChange={(value) => updateFormState('explanation', value)}
      />
      
      <LocationField
        value={formState.location || ''}
        onChange={(value) => updateFormState('location', value)}
      />
      
      <ReportDateField
        value={formState.reportDate || ''}
        onChange={(value) => updateFormState('reportDate', value)}
      />
      
      <SubmittedByField
        value={formState.submittedBy || ''}
        onChange={(value) => updateFormState('submittedBy', value)}
      />
    </>
  );
};
