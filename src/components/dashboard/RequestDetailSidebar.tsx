
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { JobProgressSection } from './JobProgressSection';
import { MaintenanceRequest } from '@/types/maintenance';

interface RequestDetailSidebarProps {
  request: MaintenanceRequest;
  onClose?: () => void;
}

export const RequestDetailSidebar = ({ request, onClose }: RequestDetailSidebarProps) => {
  const navigate = useNavigate();

  const handleOpenContractorDialog = () => {
    // Navigate to request detail page where contractor assignment is handled
    navigate(`/request/${request.id}`);
  };

  const handleOpenQuotesDialog = () => {
    // Navigate to request detail page where quotes are handled
    navigate(`/request/${request.id}`);
  };

  const handleOpenActionsDialog = () => {
    // Navigate to request detail page where actions are handled
    navigate(`/request/${request.id}`);
  };

  return (
    <div className="w-80 border-l border-gray-200 bg-white p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Job Details</h2>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        )}
      </div>
      
      <div className="mb-4">
        <h3 className="font-medium text-gray-900 mb-1">{request.title}</h3>
        <p className="text-sm text-gray-600">{request.location}</p>
      </div>
      
      <JobProgressSection
        request={request}
        onOpenContractorDialog={handleOpenContractorDialog}
        onOpenQuotesDialog={handleOpenQuotesDialog}
        onOpenActionsDialog={handleOpenActionsDialog}
      />
    </div>
  );
};
