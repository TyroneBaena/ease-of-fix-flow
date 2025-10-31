
import { useState } from 'react';
import { Contractor } from '@/types/contractor';
import { toast } from '@/lib/toast';
import { Session } from '@supabase/supabase-js';

export const useContractorDialog = (session: Session | null) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [newContractor, setNewContractor] = useState<Partial<Contractor>>({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    specialties: []
  });
  const [isPreparingDialog, setIsPreparingDialog] = useState(false);

  const handleOpenDialog = async (edit = false, contractor?: Contractor) => {
    // Prevent multiple simultaneous calls
    if (isPreparingDialog) {
      console.log('⏳ Dialog preparation already in progress, ignoring duplicate call');
      return;
    }

    try {
      setIsPreparingDialog(true);
      console.log('🚀 Opening contractor invitation dialog...');
      
      // Use session from context - no need for redundant API call
      // The visibility handler already validates the session
      if (!session) {
        console.warn('⚠️ No active session found');
        // Don't block the user - let the actual API call handle auth errors
        // This provides a smoother experience
      }
      
      // Proceed with opening dialog
      if (edit && contractor) {
        setIsEditMode(true);
        setSelectedContractor(contractor);
        setNewContractor({
          companyName: contractor.companyName,
          contactName: contractor.contactName,
          email: contractor.email,
          phone: contractor.phone,
          address: contractor.address,
          specialties: [...(contractor.specialties || [])]
        });
      } else {
        setIsEditMode(false);
        setSelectedContractor(null);
        setNewContractor({
          companyName: '',
          contactName: '',
          email: '',
          phone: '',
          address: '',
          specialties: []
        });
      }
      
      // Open dialog immediately for smooth experience
      setIsDialogOpen(true);
      console.log('✅ Contractor invitation dialog opened');
      
    } catch (error) {
      console.error('❌ Error preparing contractor invitation dialog:', error);
      toast.error('Failed to prepare invitation form. Please try again.');
    } finally {
      setIsPreparingDialog(false);
    }
  };

  const handleContractorChange = (field: keyof Contractor, value: string) => {
    setNewContractor(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSpecialtiesChange = (specialties: string[]) => {
    setNewContractor(prev => ({
      ...prev,
      specialties
    }));
  };

  return {
    isDialogOpen,
    setIsDialogOpen,
    isEditMode,
    selectedContractor,
    newContractor,
    handleOpenDialog,
    handleContractorChange,
    handleSpecialtiesChange,
    isPreparingDialog
  };
};
