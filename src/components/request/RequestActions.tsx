
import React from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from 'lucide-react';

interface RequestActionsProps {
  status: string;
}

export const RequestActions = ({ status }: RequestActionsProps) => {
  return (
    <Card className="p-6">
      <h2 className="font-semibold mb-4">Actions</h2>
      
      <div className="space-y-3">
        <Button className="w-full justify-start bg-blue-500 hover:bg-blue-600">
          <CheckCircle className="h-4 w-4 mr-2" />
          {status === 'completed' ? 'Reopen Request' : 'Mark as Complete'}
        </Button>
        
        <Button variant="outline" className="w-full justify-start text-red-600 hover:bg-red-50">
          <XCircle className="h-4 w-4 mr-2" />
          Cancel Request
        </Button>
      </div>
    </Card>
  );
};
