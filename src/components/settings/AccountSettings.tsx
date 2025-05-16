
import React, { useState } from 'react';
import { User } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from '@/lib/toast';
import { Loader2 } from 'lucide-react';

interface AccountSettingsProps {
  user: User;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({ user }) => {
  const { updateUser } = useUserContext();
  const [name, setName] = useState(user.name);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create updated user object with new name
      const updatedUser = {
        ...user,
        name: name.trim()
      };
      
      await updateUser(updatedUser);
      toast.success('Account updated successfully');
    } catch (error) {
      console.error('Error updating account:', error);
      toast.error('Failed to update account settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email" 
            value={user.email}
            disabled
            className="bg-gray-50"
          />
          <p className="text-sm text-gray-500">Email cannot be changed</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input 
            id="name" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Input 
            id="role" 
            value={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            disabled
            className="bg-gray-50"
          />
          <p className="text-sm text-gray-500">Contact an administrator to change your role</p>
        </div>
        
        <Button 
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : 'Update Account'}
        </Button>
      </form>
      
      <div className="border-t pt-4 mt-6">
        <h3 className="text-lg font-medium mb-2">Password</h3>
        <Button
          variant="outline"
          onClick={() => toast.info("Password reset feature will be implemented in a future update")}
        >
          Change Password
        </Button>
      </div>
    </div>
  );
};

export default AccountSettings;
