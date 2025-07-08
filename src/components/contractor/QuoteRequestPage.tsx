
import React from 'react';
import { QuoteRequestDialog } from './QuoteRequestDialog';
import { MaintenanceRequest } from '@/types/maintenance';

interface QuoteRequestPageProps {
  requestDetails: MaintenanceRequest | null;
  onSuccess?: () => void;
}

export const QuoteRequestPage: React.FC<QuoteRequestPageProps> = ({
  requestDetails,
  onSuccess,
}) => {
  return (
    <div className="w-full h-full">
      <div className="[&_.dialog-content]:!max-w-none [&_.dialog-content]:!w-full [&_.dialog-content]:!h-full [&_.dialog-content]:!m-0 [&_.dialog-content]:!rounded-none [&_.dialog-content]:!max-h-none">
        <QuoteRequestDialog
          open={true}
          onOpenChange={() => {}} // Handled by parent navigation
          requestDetails={requestDetails}
          onSubmitQuote={() => {}} // Not used in this context
          onSuccess={onSuccess}
        />
      </div>
    </div>
  );
};
