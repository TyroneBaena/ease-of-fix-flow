
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, QrCode, Edit } from 'lucide-react';
import PropertyQrGenerator from './PropertyQrGenerator';

interface PropertyQuickActionsProps {
  propertyId: string;
  propertyName: string;
  onOpenEditDialog: () => void;
}

export const PropertyQuickActions: React.FC<PropertyQuickActionsProps> = ({ 
  propertyId, 
  propertyName,
  onOpenEditDialog 
}) => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          className="w-full justify-start"
          onClick={() => navigate(`/new-request?propertyId=${propertyId}`)}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Maintenance Request
        </Button>
        <PropertyQrGenerator 
          propertyId={propertyId} 
          propertyName={propertyName}
        />
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={onOpenEditDialog}
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit Property Details
        </Button>
      </CardContent>
    </Card>
  );
};
