
import { useState } from 'react';
import { Contractor } from '@/types/contractor';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

export const useContractorDialog = () => {
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
      console.log('🚀 Pre-validating session before opening contractor invitation dialog...');
      
      // CRITICAL: Validate session BEFORE opening dialog
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.error('❌ No valid session found:', error);
        toast.error('Session expired. Please refresh the page and try again.');
        setIsPreparingDialog(false);
        return;
      }
      
      console.log('✅ Session validated successfully:', {
        hasSession: !!session,
        hasAccessToken: !!session.access_token,
        userEmail: session.user?.email
      });
      
      // Session is valid, proceed with opening dialog
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
      
      // Only open dialog after session validation succeeds
      setIsDialogOpen(true);
      console.log('✅ Contractor invitation dialog opened with valid session');
      
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
