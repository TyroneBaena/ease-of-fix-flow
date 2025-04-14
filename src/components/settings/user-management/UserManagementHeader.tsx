
import React from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';

interface UserManagementHeaderProps {
  onInviteUser: () => void;
}

const UserManagementHeader: React.FC<UserManagementHeaderProps> = ({ onInviteUser }) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-xl font-semibold">User Management</h2>
      <Button onClick={onInviteUser} className="flex items-center">
        <UserPlus className="mr-2 h-4 w-4" />
        Invite User
      </Button>
    </div>
  );
};

export default UserManagementHeader;
