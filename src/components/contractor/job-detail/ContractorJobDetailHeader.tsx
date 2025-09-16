
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MaintenanceRequest } from '@/types/maintenance';

interface ContractorJobDetailHeaderProps {
  job: MaintenanceRequest;
  onUpdateProgress: () => void;
}

export const ContractorJobDetailHeader = ({ job, onUpdateProgress }: ContractorJobDetailHeaderProps) => {
  const navigate = useNavigate();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'in-progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
      <div className="flex items-center gap-2 mb-4 md:mb-0">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">{job.title}</h1>
        {getStatusBadge(job.status)}
      </div>
      
      {(job.status === 'in-progress' || job.status === 'pending') && (
        <Button onClick={onUpdateProgress}>Update Progress</Button>
      )}
    </div>
  );
};
