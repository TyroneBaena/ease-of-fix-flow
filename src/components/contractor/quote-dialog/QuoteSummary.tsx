
import React from 'react';
import { MaintenanceRequest } from '@/types/maintenance';

interface QuoteSummaryProps {
  request: MaintenanceRequest | null;
}

export const QuoteSummary = ({ request }: QuoteSummaryProps) => {
  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Maintenance Request</h3>
      <div className="bg-muted p-3 rounded-md text-sm">
        <p className="font-semibold">{request?.title}</p>
        <p className="text-xs text-muted-foreground mt-1">ID: {request?.id}</p>
      </div>
    </div>
  );
};
