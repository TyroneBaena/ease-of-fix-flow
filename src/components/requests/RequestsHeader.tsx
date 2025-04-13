
import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RequestsHeaderProps {
  title: string;
  subtitle: string;
}

const RequestsHeader: React.FC<RequestsHeaderProps> = ({ title, subtitle }) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600">{subtitle}</p>
      </div>
      <Button 
        onClick={() => navigate('/new-request')} 
        className="mt-4 md:mt-0 bg-blue-500 hover:bg-blue-600"
      >
        <Plus className="mr-2 h-4 w-4" /> New Request
      </Button>
    </div>
  );
};

export default RequestsHeader;
