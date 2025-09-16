
import React, { useState } from 'react';
import { User } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { toast } from 'sonner';
import { Loader2, Key } from 'lucide-react';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AccountSettingsProps {
  user: User;
}

const AccountSettings: React.FC<AccountSettingsProps> = ({ user }) => {
  const { updateUser, resetPassword } = useUserContext();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create updated user object with new name and phone
      const updatedUser = {
        ...user,
        name: name.trim(),
        phone: phone.trim() || undefined
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

  const handlePasswordReset = async () => {
    setIsResetSubmitting(true);
    
    try {
      const result = await resetPassword(user.id, user.email);
      
      if (result.success) {
        toast.success('Password reset email sent successfully');
        setIsPasswordDialogOpen(false);
      } else {
        toast.error(`Failed to send password reset email: ${result.message}`);
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(`Password reset failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsResetSubmitting(false);
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
          <Label htmlFor="phone">Phone Number</Label>
          <Input 
            id="phone" 
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Your phone number"
          />
          <p className="text-sm text-gray-500">Optional - for contact purposes</p>
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
          onClick={() => setIsPasswordDialogOpen(true)}
        >
          Change Password
        </Button>
      </div>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              We'll send a password reset link to your email address.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex items-center justify-center mb-4 text-amber-500">
              <Key size={32} />
            </div>
            <p className="text-center text-gray-700">
              A link will be sent to: <span className="font-medium">{user.email}</span>
            </p>
            <p className="text-center text-gray-500 text-sm mt-2">
              The link will expire after 24 hours
            </p>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPasswordDialogOpen(false)}
              disabled={isResetSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePasswordReset}
              disabled={isResetSubmitting}
            >
              {isResetSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : 'Send Reset Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountSettings;
