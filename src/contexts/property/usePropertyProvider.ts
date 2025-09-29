
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Property } from '@/types/property';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { useUserContext } from '../UnifiedAuthContext';
import { PropertyContextType } from './PropertyContextTypes';
import { fetchProperties } from './propertyOperations';

export const usePropertyProvider = (): PropertyContextType => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingFailed, setLoadingFailed] = useState<boolean>(false);
  const { currentUser } = useUserContext();

  useEffect(() => {
    console.log('PropertyProvider: useEffect triggered', { 
      currentUser: currentUser ? `User: ${currentUser.email}` : 'No user',
      userId: currentUser?.id 
    });
    
    if (currentUser) {
      console.log('PropertyProvider: User found, calling fetchAndSetProperties');
      fetchAndSetProperties();
    } else {
      console.log('PropertyProvider: No user, clearing properties');
      setProperties([]);
      setLoading(false);
      setLoadingFailed(false);
    }
  }, [currentUser]);

  // Fetch properties from database
  const fetchAndSetProperties = useCallback(async () => {
    try {
      console.log('PropertyProvider: fetchAndSetProperties called');
      setLoading(true);
      setLoadingFailed(false);
      console.log('PropertyContext: Fetching properties for user:', currentUser?.id);
      
      const formattedProperties = await fetchProperties();
      
      console.log('PropertyContext: Properties fetched successfully');
      console.log('PropertyContext: Number of properties:', formattedProperties.length);
      console.log('PropertyContext: Property details:', formattedProperties.map(p => ({ id: p.id, name: p.name, email: p.email })));
      console.log('PropertyContext: Sample Property emails:', formattedProperties.filter(p => p.name === 'Sample Property').map(p => ({ id: p.id, email: p.email })));
      setProperties(formattedProperties);
    } catch (err) {
      console.error('PropertyContext: Error fetching properties:', err);
      setLoadingFailed(true);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

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
      
      // Trigger billing integration hook to handle notifications and billing updates
      // This will be handled by usePropertyBillingIntegration automatically through the properties.length change
      
      return newProperty;
    } catch (err) {
      console.error('Unexpected error adding property:', err);
      toast.error('An unexpected error occurred');
    }
  }, [currentUser]);

  const getProperty = useCallback((id: string): Property | undefined => {
    console.log('PropertyContext: getProperty called with ID:', id);
    // Use ref or state callback to avoid circular dependency
    let foundProperty: Property | undefined;
    setProperties(prev => {
      foundProperty = prev.find(property => property.id === id);
      console.log('PropertyContext: Available properties:', prev.map(p => ({ id: p.id, name: p.name })));
      console.log('PropertyContext: Found property:', foundProperty);
      return prev; // Don't actually update state
    });
    return foundProperty;
  }, []);

  const updateProperty = useCallback(async (id: string, propertyUpdate: Partial<Property>) => {
    console.log('PropertyContext: updateProperty called with ID:', id);
    console.log('PropertyContext: Current user:', currentUser);
    console.log('PropertyContext: Property update data:', propertyUpdate);
    
    try {
      if (!currentUser) {
        console.error('PropertyContext: No current user - blocking update');
        toast.error('You must be logged in to update a property');
        return;
      }

      console.log('PropertyContext: User authenticated, proceeding with update');

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

      console.log('PropertyContext: Mapped data for database:', propertyToUpdate);
      console.log('PropertyContext: Sending PATCH request to Supabase...');

      const { data, error } = await supabase
        .from('properties')
        .update(propertyToUpdate)
        .eq('id', id)
        .select('*'); // Add select to see what was actually updated

      console.log('PropertyContext: Supabase response - data:', data);
      console.log('PropertyContext: Supabase response - error:', error);

      if (error) {
        console.error('PropertyContext: Supabase update error:', error);
        toast.error('Failed to update property');
        return;
      }

      if (!data || data.length === 0) {
        console.error('PropertyContext: No rows were updated! This suggests the property was not found or RLS blocked the update');
        toast.error('Property update failed - no rows affected');
        return;
      }

      console.log('PropertyContext: Database update successful');
      console.log('PropertyContext: Updated data from DB:', data[0]);
      console.log('PropertyContext: Updating local state...');

      setProperties(properties.map(property => 
        property.id === id ? { ...property, ...propertyUpdate } : property
      ));
      
      console.log('PropertyContext: Local state updated');
      toast.success('Property updated successfully');
    } catch (err) {
      console.error('PropertyContext: Unexpected error updating property:', err);
      toast.error('An unexpected error occurred');
    }
  }, [currentUser, properties]);

  const deleteProperty = useCallback(async (id: string) => {
    try {
      if (!currentUser) {
        toast.error('You must be logged in to delete a property');
        return;
      }

      // Get property name using state callback to avoid circular dependency
      let propertyName = 'Property';
      setProperties(prev => {
        const deletedProperty = prev.find(p => p.id === id);
        propertyName = deletedProperty?.name || 'Property';
        return prev; // Don't actually update state here
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
      
      // Show deletion confirmation with billing impact
      toast.success(`${propertyName} deleted successfully`);
      
      // Billing will be automatically recalculated by usePropertyBillingIntegration 
      // through the properties.length change
      
    } catch (err) {
      console.error('Unexpected error deleting property:', err);
      toast.error('An unexpected error occurred');
    }
  }, [currentUser]);
      setProperties(prev => {
        const deletedProperty = prev.find(p => p.id === id);
        propertyName = deletedProperty?.name || 'Property';
        return prev; // Don't actually update here
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
      
      // Show deletion confirmation with billing impact
      toast.success(`${propertyName} deleted successfully`);
      
      // Billing will be automatically recalculated by usePropertyBillingIntegration 
      // through the properties.length change
      
    } catch (err) {
      console.error('Unexpected error deleting property:', err);
      toast.error('An unexpected error occurred');
    }
  }, [currentUser]);

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
