
import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
  // Override the dialog styles to make it full screen
  return (
    <div className="w-full">
      <style jsx>{`
        .quote-request-dialog .dialog-content {
          max-width: none !important;
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          border-radius: 0 !important;
          max-height: none !important;
        }
      `}</style>
      
      <div className="quote-request-dialog">
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
