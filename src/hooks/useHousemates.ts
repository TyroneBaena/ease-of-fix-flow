import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Housemate } from '@/types/housemate';
import { toast } from 'sonner';

interface UseHousematesReturn {
  housemates: Housemate[];
  loading: boolean;
  fetchHousemates: (propertyId: string, includeArchived?: boolean) => Promise<void>;
  addHousemate: (data: Omit<Housemate, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>) => Promise<boolean>;
  updateHousemate: (id: string, updates: Partial<Housemate>) => Promise<boolean>;
  moveHousemate: (id: string, newPropertyId: string) => Promise<boolean>;
  archiveHousemate: (id: string) => Promise<boolean>;
  unarchiveHousemate: (id: string) => Promise<boolean>;
  deleteHousemate: (id: string) => Promise<boolean>;
  refreshHousemates: () => Promise<void>;
}

export const useHousemates = (initialPropertyId?: string): UseHousematesReturn => {
  const [housemates, setHousemates] = useState<Housemate[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPropertyId, setCurrentPropertyId] = useState<string | undefined>(initialPropertyId);
  const [includeArchivedState, setIncludeArchivedState] = useState(false);

  const transformHousemate = (row: any): Housemate => ({
    id: row.id,
    propertyId: row.property_id,
    organizationId: row.organization_id,
    firstName: row.first_name,
    lastName: row.last_name,
    rentUtilitiesAmount: row.rent_utilities_amount,
    rentPeriod: row.rent_period,
    personalProfile: row.personal_profile,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  });

  const fetchHousemates = useCallback(async (propertyId: string, includeArchived = false) => {
    setLoading(true);
    setCurrentPropertyId(propertyId);
    setIncludeArchivedState(includeArchived);
    
    try {
      let query = supabase
        .from('housemates')
        .select('*')
        .eq('property_id', propertyId)
        .order('last_name', { ascending: true });

      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }

      const { data, error } = await query;

      if (error) throw error;

      setHousemates((data || []).map(transformHousemate));
    } catch (error: any) {
      console.error('Error fetching housemates:', error);
      toast.error('Failed to load housemates');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshHousemates = useCallback(async () => {
    if (currentPropertyId) {
      await fetchHousemates(currentPropertyId, includeArchivedState);
    }
  }, [currentPropertyId, includeArchivedState, fetchHousemates]);

  const addHousemate = useCallback(async (data: Omit<Housemate, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userData.user?.id)
        .single();

      const { error } = await supabase.from('housemates').insert({
        property_id: data.propertyId,
        organization_id: profile?.organization_id,
        first_name: data.firstName,
        last_name: data.lastName,
        rent_utilities_amount: data.rentUtilitiesAmount,
        rent_period: data.rentPeriod,
        personal_profile: data.personalProfile,
        created_by: userData.user?.id,
      });

      if (error) throw error;

      toast.success('Housemate added successfully');
      await refreshHousemates();
      return true;
    } catch (error: any) {
      console.error('Error adding housemate:', error);
      toast.error('Failed to add housemate');
      return false;
    }
  }, [refreshHousemates]);

  const updateHousemate = useCallback(async (id: string, updates: Partial<Housemate>): Promise<boolean> => {
    try {
      const dbUpdates: any = {};
      if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName;
      if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName;
      if (updates.rentUtilitiesAmount !== undefined) dbUpdates.rent_utilities_amount = updates.rentUtilitiesAmount;
      if (updates.rentPeriod !== undefined) dbUpdates.rent_period = updates.rentPeriod;
      if (updates.personalProfile !== undefined) dbUpdates.personal_profile = updates.personalProfile;

      const { error } = await supabase
        .from('housemates')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      toast.success('Housemate updated successfully');
      await refreshHousemates();
      return true;
    } catch (error: any) {
      console.error('Error updating housemate:', error);
      toast.error('Failed to update housemate');
      return false;
    }
  }, [refreshHousemates]);

  const moveHousemate = useCallback(async (id: string, newPropertyId: string): Promise<boolean> => {
    try {
      // Get the new property's organization_id
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('organization_id')
        .eq('id', newPropertyId)
        .single();

      if (propertyError) throw propertyError;

      const { error } = await supabase
        .from('housemates')
        .update({ 
          property_id: newPropertyId,
          organization_id: property.organization_id 
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Housemate moved successfully');
      await refreshHousemates();
      return true;
    } catch (error: any) {
      console.error('Error moving housemate:', error);
      toast.error('Failed to move housemate');
      return false;
    }
  }, [refreshHousemates]);

  const archiveHousemate = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('housemates')
        .update({ is_archived: true })
        .eq('id', id);

      if (error) throw error;

      toast.success('Housemate archived successfully');
      await refreshHousemates();
      return true;
    } catch (error: any) {
      console.error('Error archiving housemate:', error);
      toast.error('Failed to archive housemate');
      return false;
    }
  }, [refreshHousemates]);

  const unarchiveHousemate = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('housemates')
        .update({ is_archived: false })
        .eq('id', id);

      if (error) throw error;

      toast.success('Housemate restored successfully');
      await refreshHousemates();
      return true;
    } catch (error: any) {
      console.error('Error restoring housemate:', error);
      toast.error('Failed to restore housemate');
      return false;
    }
  }, [refreshHousemates]);

  const deleteHousemate = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('housemates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Housemate deleted successfully');
      await refreshHousemates();
      return true;
    } catch (error: any) {
      console.error('Error deleting housemate:', error);
      toast.error('Failed to delete housemate');
      return false;
    }
  }, [refreshHousemates]);

  return {
    housemates,
    loading,
    fetchHousemates,
    addHousemate,
    updateHousemate,
    moveHousemate,
    archiveHousemate,
    unarchiveHousemate,
    deleteHousemate,
    refreshHousemates,
  };
};
