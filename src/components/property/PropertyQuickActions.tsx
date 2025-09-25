
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Edit } from 'lucide-react';
import { useSubscription } from "@/contexts/subscription/SubscriptionContext";

interface PropertyQuickActionsProps {
  propertyId: string;
  onOpenEditDialog: () => void;
  isTemporaryAccess?: boolean;
}

export const PropertyQuickActions: React.FC<PropertyQuickActionsProps> = ({ 
  propertyId, 
  onOpenEditDialog,
  isTemporaryAccess = false
}) => {
  const navigate = useNavigate();
  const { refreshPropertyCount } = useSubscription();

  const handleNewRequest = () => {
    navigate(`/new-request?propertyId=${propertyId}`);
    // Refresh property count when navigating to ensure billing is up to date
    refreshPropertyCount();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          className="w-full justify-start"
          onClick={handleNewRequest}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Maintenance Request
        </Button>
        {!isTemporaryAccess && (
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={onOpenEditDialog}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Property Details
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
