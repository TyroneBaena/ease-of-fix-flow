
import { useState } from 'react';
import { Contractor } from '@/types/contractor';

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

  const handleOpenDialog = (edit = false, contractor?: Contractor) => {
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
    
    setIsDialogOpen(true);
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
    handleSpecialtiesChange
  };
};
