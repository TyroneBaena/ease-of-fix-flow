
import { useState, useCallback, useEffect } from 'react';
import { Contractor } from '@/types/contractor';
import { useUserContext } from '@/contexts/UserContext';
import { toast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';

// Define per page limit
const CONTRACTORS_PER_PAGE = 10;

export const useContractorManagement = () => {
  const { currentUser, isAdmin } = useUserContext();
  
  // Contractor state
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<Error | null>(null);
  
  // Dialog and form state
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
  
  // Delete dialog state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Fetch contractors
  const fetchContractors = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      console.log("Fetching contractors...");
      setLoading(true);
      
      // Get the total count
      const { count, error: countError } = await supabase
        .from('contractors')
        .select('*', { count: 'exact', head: true });
      
      if (countError) throw countError;
      
      // Calculate total pages
      const total = count || 0;
      const pages = Math.max(1, Math.ceil(total / CONTRACTORS_PER_PAGE));
      setTotalPages(pages);
      
      // Adjust current page if needed
      if (currentPage > pages) {
        setCurrentPage(pages);
      }
      
      // Fetch paginated data
      const from = (currentPage - 1) * CONTRACTORS_PER_PAGE;
      const to = from + CONTRACTORS_PER_PAGE - 1;
      
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .range(from, to)
        .order('company_name', { ascending: true });
        
      if (error) throw error;
      
      // Map the data to our Contractor type
      const mappedContractors = data.map(item => ({
        id: item.id,
        userId: item.user_id,
        companyName: item.company_name,
        contactName: item.contact_name,
        email: item.email,
        phone: item.phone,
        address: item.address || '',
        specialties: item.specialties || [],
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
      
      setContractors(mappedContractors);
      setFetchError(null);
    } catch (err) {
      console.error('Error fetching contractors:', err);
      setFetchError(err instanceof Error ? err : new Error('Failed to fetch contractors'));
      toast.error('Failed to load contractors');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, currentPage]);
  
  // Fetch contractors on mount and when page changes
  useEffect(() => {
    fetchContractors();
  }, [fetchContractors]);
  
  // Handle opening the dialog for adding/editing
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
  
  // Handle contractor field changes
  const handleContractorChange = (field: keyof Contractor, value: string) => {
    setNewContractor(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle specialties changes
  const handleSpecialtiesChange = (specialties: string[]) => {
    setNewContractor(prev => ({
      ...prev,
      specialties
    }));
  };
  
  // Handle saving a contractor
  const handleSaveContractor = async () => {
    try {
      setLoading(true);
      
      if (isEditMode && selectedContractor) {
        // Update existing contractor
        const { error } = await supabase
          .from('contractors')
          .update({
            company_name: newContractor.companyName,
            contact_name: newContractor.contactName,
            email: newContractor.email,
            phone: newContractor.phone,
            address: newContractor.address || null,
            specialties: newContractor.specialties || [],
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedContractor.id);
          
        if (error) throw error;
        toast.success('Contractor updated successfully');
      } else {
        // Call the edge function to create a new contractor with invitation email
        const { data, error } = await supabase.functions.invoke('invite-contractor', {
          body: {
            email: newContractor.email,
            companyName: newContractor.companyName,
            contactName: newContractor.contactName,
            phone: newContractor.phone,
            address: newContractor.address || null,
            specialties: newContractor.specialties || []
          }
        });
        
        if (error) throw error;
        
        if (data.success) {
          toast.success(`Invitation sent to ${newContractor.email}`);
          
          if (data.testMode) {
            toast.info('Note: Email was sent in test mode');
          }
        } else {
          throw new Error(data.message || 'Failed to invite contractor');
        }
      }
      
      // Close dialog and refresh list
      setIsDialogOpen(false);
      await fetchContractors();
    } catch (err) {
      console.error('Error saving contractor:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save contractor');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle resetting a contractor's password
  const handleResetPassword = async (contractorId: string, email: string) => {
    try {
      setLoading(true);
      
      // Find the user ID for this contractor
      const { data: contractorData, error: contractorError } = await supabase
        .from('contractors')
        .select('user_id')
        .eq('id', contractorId)
        .single();
        
      if (contractorError) throw contractorError;
      
      if (!contractorData?.user_id) {
        throw new Error('Could not find user account for this contractor');
      }
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      
      if (error) throw error;
      
      toast.success(`Password reset email sent to ${email}`);
    } catch (err) {
      console.error('Error resetting password:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle confirming contractor deletion
  const confirmDeleteContractor = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    setIsDeleteConfirmOpen(true);
  };
  
  // Handle deleting a contractor
  const handleDeleteContractor = async () => {
    if (!selectedContractor) return;
    
    try {
      setLoading(true);
      
      // Delete the contractor
      const { error } = await supabase
        .from('contractors')
        .delete()
        .eq('id', selectedContractor.id);
        
      if (error) throw error;
      
      toast.success(`Contractor ${selectedContractor.companyName} deleted successfully`);
      setIsDeleteConfirmOpen(false);
      
      // Refresh the list
      await fetchContractors();
    } catch (err) {
      console.error('Error deleting contractor:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete contractor');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  return {
    contractors,
    currentUser,
    isAdmin,
    isLoading: loading,
    fetchError,
    isDialogOpen,
    setIsDialogOpen,
    isEditMode,
    newContractor,
    selectedContractor,
    currentPage,
    totalPages,
    CONTRACTORS_PER_PAGE,
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    handleOpenDialog,
    handleContractorChange,
    handleSpecialtiesChange,
    handleSaveContractor,
    handleResetPassword,
    confirmDeleteContractor,
    handleDeleteContractor,
    handlePageChange,
    fetchContractors
  };
};
