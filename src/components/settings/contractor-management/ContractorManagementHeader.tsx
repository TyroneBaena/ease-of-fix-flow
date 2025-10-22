
import React from 'react';
import { Button } from '@/components/ui/button';
import { HardHat, Plus, RefreshCw, Loader2 } from 'lucide-react';

interface ContractorManagementHeaderProps {
  onInviteContractor: () => void;
  isPreparingDialog?: boolean;
}

const ContractorManagementHeader = ({ 
  onInviteContractor,
  isPreparingDialog = false
}: ContractorManagementHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
      <div>
        <h2 className="text-xl font-semibold mb-1 flex items-center">
          <HardHat className="mr-2 h-5 w-5" />
          Contractors Management
        </h2>
        <p className="text-sm text-muted-foreground">
          Invite and manage contractors for maintenance work
        </p>
      </div>
      
      <Button 
        onClick={onInviteContractor} 
        size="sm"
        disabled={isPreparingDialog}
      >
        {isPreparingDialog ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Preparing...
          </>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            Invite Contractor
          </>
        )}
      </Button>
    </div>
  );
};

export default ContractorManagementHeader;
