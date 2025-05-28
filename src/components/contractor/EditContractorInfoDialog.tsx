
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';

interface ContractorProfile {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address?: string;
}

interface EditContractorInfoDialogProps {
  contractor: ContractorProfile | null;
  onUpdate: () => void;
  children: React.ReactNode;
}

export const EditContractorInfoDialog: React.FC<EditContractorInfoDialogProps> = ({
  contractor,
  onUpdate,
  children
}) => {
  const { currentUser } = useUserContext();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    address: ''
  });

  // Update form data when contractor or dialog opens
  useEffect(() => {
    if (contractor && open) {
      console.log('Setting form data with contractor:', contractor);
      setFormData({
        companyName: contractor.companyName || '',
        contactName: contractor.contactName || currentUser?.name || '',
        email: contractor.email || currentUser?.email || '',
        phone: contractor.phone || '',
        address: contractor.address || ''
      });
    } else if (!contractor && open && currentUser) {
      // If no contractor profile exists, use current user data
      console.log('Setting form data with current user:', currentUser);
      setFormData({
        companyName: '',
        contactName: currentUser.name || '',
        email: currentUser.email || '',
        phone: '',
        address: ''
      });
    }
  }, [contractor, open, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    
    if (!currentUser?.id) {
      toast.error('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      if (contractor?.id) {
        // Update existing contractor profile
        console.log('Updating contractor profile with ID:', contractor.id);
        const { error } = await supabase
          .from('contractors')
          .update({
            company_name: formData.companyName,
            contact_name: formData.contactName,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            updated_at: new Date().toISOString()
          })
          .eq('id', contractor.id);

        if (error) {
          console.error('Error updating contractor:', error);
          throw error;
        }
      } else {
        // Create new contractor profile
        console.log('Creating new contractor profile for user:', currentUser.id);
        const { error } = await supabase
          .from('contractors')
          .insert({
            user_id: currentUser.id,
            company_name: formData.companyName,
            contact_name: formData.contactName,
            email: formData.email,
            phone: formData.phone,
            address: formData.address
          });

        if (error) {
          console.error('Error creating contractor:', error);
          throw error;
        }
      }

      console.log('Profile saved successfully');
      toast.success('Profile updated successfully');
      setOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error saving contractor profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    console.log(`Updating field ${field} with value:`, value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Information</DialogTitle>
          <DialogDescription>
            Update your contractor profile information. All fields are required except address.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => handleInputChange('companyName', e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contactName">Contact Name</Label>
            <Input
              id="contactName"
              value={formData.contactName}
              onChange={(e) => handleInputChange('contactName', e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
