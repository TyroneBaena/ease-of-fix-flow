
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Property } from '@/types/property';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { useUnifiedAuth } from '../UnifiedAuthContext';
import { PropertyContextType } from './PropertyContextTypes';
import { fetchProperties } from './propertyOperations';

/**
 * v78.0: SIMPLIFIED - Pure data fetching, no complex refresh logic
 */
export const usePropertyProvider = (): PropertyContextType => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingFailed, setLoadingFailed] = useState<boolean>(false);
  const { currentUser, isSessionReady } = useUnifiedAuth();
  const lastFetchedUserIdRef = useRef<string | null>(null);
  const authStateRef = useRef({ isSessionReady, currentUser });
  
  useEffect(() => {
    authStateRef.current = { isSessionReady, currentUser };
  }, [isSessionReady, currentUser]);

  const fetchAndSetProperties = useCallback(async () => {
    const { isSessionReady: sessionReady, currentUser: user } = authStateRef.current;
    const userId = user?.id;
    
    console.log('v78.0 - PropertyProvider: fetchAndSetProperties', { sessionReady, hasUser: !!userId });
    
    if (!sessionReady) {
      console.log('v78.0 - PropertyProvider: Waiting for session ready...');
      return;
    }
    
    if (!userId) {
      console.log('v78.0 - PropertyProvider: No user, skipping');
      return;
    }

    setLoading(true);
    setLoadingFailed(false);

    try {
      console.log('v78.0 - PropertyProvider: Fetching properties...');
      const formattedProperties = await fetchProperties();
      console.log('✅ v78.0 - Properties fetched:', formattedProperties.length);
      setProperties(formattedProperties);
    } catch (err) {
      console.error('❌ v78.0 - Error fetching properties:', err);
      toast.error('Failed to load properties');
      setLoadingFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('PropertyProvider: useEffect triggered');
    
    if (!isSessionReady) {
      console.log('PropertyProvider: Waiting for session ready...');
      return;
    }
    
    if (!currentUser?.id) {
      console.log('PropertyProvider: No user, clearing properties');
      setProperties([]);
      setLoading(false);
      setLoadingFailed(false);
      lastFetchedUserIdRef.current = null;
      return;
    }
    
    // Only fetch if user ID changed
    if (lastFetchedUserIdRef.current === currentUser.id) {
      console.log('PropertyProvider: User unchanged, skipping fetch');
      return;
    }
    
    lastFetchedUserIdRef.current = currentUser.id;
    fetchAndSetProperties();
  }, [currentUser?.id, isSessionReady, fetchAndSetProperties]);

  const addProperty = useCallback(async (property: Omit<Property, 'id' | 'createdAt'>) => {
    try {
      if (!currentUser) {
        toast.error('You must be logged in to add a property');
        return;
      }

      const propertyToInsert = {
        name: property.name,
        address: property.address,
        contact_number: property.contactNumber,
        email: property.email,
        practice_leader: property.practiceLeader,
        practice_leader_email: property.practiceLeaderEmail,
        practice_leader_phone: property.practiceLeaderPhone,
        renewal_date: property.renewalDate || null,
        rent_amount: property.rentAmount,
        rent_period: property.rentPeriod,
        user_id: currentUser.id,
        landlord_id: property.landlordId ?? null,
      };

      const { data, error } = await supabase
        .from('properties')
        .insert(propertyToInsert)
        .select('*')
        .single();

      if (error) {
        console.error('Error adding property:', error);
        toast.error('Failed to add property');
        return;
      }

      const d: any = data;
      const newProperty: Property = {
        id: d.id,
        name: d.name,
        address: d.address,
        contactNumber: d.contact_number,
        email: d.email,
        practiceLeader: d.practice_leader,
        practiceLeaderEmail: d.practice_leader_email || '',
        practiceLeaderPhone: d.practice_leader_phone || '',
        renewalDate: d.renewal_date ? new Date(d.renewal_date).toISOString() : '',
        rentAmount: Number(d.rent_amount) || 0,
        rentPeriod: (d.rent_period as 'week' | 'month') || 'month',
        createdAt: d.created_at,
        landlordId: d.landlord_id || undefined,
      };

      setProperties(prev => [...prev, newProperty]);
      return newProperty;
    } catch (err) {
      console.error('Unexpected error adding property:', err);
      toast.error('An unexpected error occurred');
    }
  }, [currentUser?.id]);

  const getProperty = useCallback((id: string): Property | undefined => {
    return properties.find(property => property.id === id);
  }, [properties]);

  const updateProperty = useCallback(async (id: string, propertyUpdate: Partial<Property>) => {
    try {
      if (!currentUser) {
        toast.error('You must be logged in to update a property');
        return;
      }

      const propertyToUpdate: any = {};
      if ('name' in propertyUpdate) propertyToUpdate.name = propertyUpdate.name;
      if ('address' in propertyUpdate) propertyToUpdate.address = propertyUpdate.address;
      if ('contactNumber' in propertyUpdate) propertyToUpdate.contact_number = propertyUpdate.contactNumber;
      if ('email' in propertyUpdate) propertyToUpdate.email = propertyUpdate.email;
      if ('practiceLeader' in propertyUpdate) propertyToUpdate.practice_leader = propertyUpdate.practiceLeader;
      if ('practiceLeaderEmail' in propertyUpdate) propertyToUpdate.practice_leader_email = propertyUpdate.practiceLeaderEmail;
      if ('practiceLeaderPhone' in propertyUpdate) propertyToUpdate.practice_leader_phone = propertyUpdate.practiceLeaderPhone;
      if ('renewalDate' in propertyUpdate) propertyToUpdate.renewal_date = propertyUpdate.renewalDate || null;
      if ('rentAmount' in propertyUpdate) propertyToUpdate.rent_amount = propertyUpdate.rentAmount;
      if ('rentPeriod' in propertyUpdate) propertyToUpdate.rent_period = propertyUpdate.rentPeriod;
      if ('landlordId' in propertyUpdate) propertyToUpdate.landlord_id = propertyUpdate.landlordId ?? null;

      const { data, error } = await supabase
        .from('properties')
        .update(propertyToUpdate)
        .eq('id', id)
        .select('*');

      if (error) {
        console.error('PropertyContext: Update error:', error);
        toast.error('Failed to update property');
        return;
      }

      if (!data || data.length === 0) {
        toast.error('Property update failed - no rows affected');
        return;
      }

      setProperties(prev => prev.map(property => 
        property.id === id ? { ...property, ...propertyUpdate } : property
      ));
      
      toast.success('Property updated successfully');
    } catch (err) {
      console.error('PropertyContext: Unexpected error updating property:', err);
      toast.error('An unexpected error occurred');
    }
  }, [currentUser?.id]);

  const deleteProperty = useCallback(async (id: string) => {
    try {
      if (!currentUser) {
        toast.error('You must be logged in to delete a property');
        return;
      }

      let propertyName = 'Property';
      setProperties(prev => {
        const deletedProperty = prev.find(p => p.id === id);
        propertyName = deletedProperty?.name || 'Property';
        return prev;
      });

      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting property:', error);
        toast.error('Failed to delete property');
        return;
      }

      setProperties(prev => prev.filter(property => property.id !== id));
      toast.success(`${propertyName} deleted successfully`);
    } catch (err) {
      console.error('Unexpected error deleting property:', err);
      toast.error('An unexpected error occurred');
    }
  }, [currentUser?.id]);

  return useMemo(() => ({
    properties,
    loading,
    loadingFailed,
    addProperty,
    getProperty,
    updateProperty,
    deleteProperty
  }), [
    properties,
    loading,
    loadingFailed,
    addProperty,
    getProperty,
    updateProperty,
    deleteProperty
  ]);
};
