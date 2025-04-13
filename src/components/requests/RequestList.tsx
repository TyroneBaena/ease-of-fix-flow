
import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RequestCard from '@/components/RequestCard';
import { MaintenanceRequest } from '@/types/property';

interface RequestListProps {
  requests: MaintenanceRequest[];
  emptyMessage?: string;
}

const RequestList: React.FC<RequestListProps> = ({ requests, emptyMessage }) => {
  const navigate = useNavigate();
  
  return (
    <div className="space-y-4">
      {requests.length > 0 ? (
        requests.map(request => (
          <RequestCard 
            key={request.id} 
            request={request} 
            onClick={() => navigate(`/requests/${request.id}`)} 
          />
        ))
      ) : (
        <div className="text-center py-16 bg-white rounded-lg shadow-sm">
          <Wrench className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No requests found</h3>
          <p className="text-gray-500 mb-4">
            {emptyMessage || "Submit a new maintenance request to get started"}
          </p>
          <Button 
            onClick={() => navigate('/new-request')}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </div>
      )}
    </div>
  );
};

export default RequestList;
