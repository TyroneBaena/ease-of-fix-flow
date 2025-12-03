
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Loader2, RefreshCw } from 'lucide-react';

interface UserManagementHeaderProps {
  onInviteUser: () => void;
  isPreparingDialog?: boolean;
  onRefresh?: () => Promise<void>;
}

const UserManagementHeader: React.FC<UserManagementHeaderProps> = ({ 
  onInviteUser,
  isPreparingDialog = false,
  onRefresh
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleClick = () => {
    console.log('🎯 Invite User button clicked');
    onInviteUser();
  };

  const handleRefresh = async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-xl font-semibold">User Management</h2>
      <div className="flex items-center gap-2">
        {onRefresh && (
          <Button 
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            size="sm"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        )}
        <Button 
          onClick={handleClick} 
          className="flex items-center"
          disabled={isPreparingDialog}
        >
          {isPreparingDialog ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Preparing...
            </>
          ) : (
            <>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite User
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default UserManagementHeader;
