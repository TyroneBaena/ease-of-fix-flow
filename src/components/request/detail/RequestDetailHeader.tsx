
import React from 'react';
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface RequestDetailHeaderProps {
  onBack: () => void;
}

export const RequestDetailHeader = ({ onBack }: RequestDetailHeaderProps) => {
  return (
    <Button 
      variant="ghost" 
      className="mb-6"
      onClick={onBack}
    >
      <ArrowLeft className="h-4 w-4 mr-2" />
      Back to Requests
    </Button>
  );
};
