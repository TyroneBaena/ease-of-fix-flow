
import React from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, Loader2 } from 'lucide-react';

interface UserManagementHeaderProps {
  onInviteUser: () => void;
  isPreparingDialog?: boolean;
}

const UserManagementHeader: React.FC<UserManagementHeaderProps> = ({ 
  onInviteUser,
  isPreparingDialog = false
}) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-xl font-semibold">User Management</h2>
      <Button 
        onClick={onInviteUser} 
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
  );
};

export default UserManagementHeader;
