
import { useState, useEffect } from 'react';
import { Property } from '@/types/property';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { useUserContext } from '../UserContext';
import { PropertyContextType } from './PropertyContextTypes';
import { fetchProperties } from './propertyOperations';

export const usePropertyProvider = (): PropertyContextType => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingFailed, setLoadingFailed] = useState<boolean>(false);
  const { currentUser } = useUserContext();

  useEffect(() => {
    if (currentUser) {
      fetchAndSetProperties();
    } else {
      setProperties([]);
      setLoading(false);
      setLoadingFailed(false);
    }
  }, [currentUser]);

  // Fetch properties from database
  const fetchAndSetProperties = async () => {
    try {
      setLoading(true);
      setLoadingFailed(false);
      console.log('PropertyContext: Fetching properties for user:', currentUser?.id);
      
      const formattedProperties = await fetchProperties();
      
      console.log('PropertyContext: Properties fetched successfully');
      console.log('PropertyContext: Number of properties:', formattedProperties.length);
      console.log('PropertyContext: Property details:', formattedProperties.map(p => ({ id: p.id, name: p.name })));
      setProperties(formattedProperties);
    } catch (err) {
      console.error('PropertyContext: Error fetching properties:', err);
      setLoadingFailed(true);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const addProperty = async (property: Omit<Property, 'id' | 'createdAt'>) => {
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
      toast.success('Property added successfully');
      return newProperty;
    } catch (err) {
      console.error('Unexpected error adding property:', err);
      toast.error('An unexpected error occurred');
    }
  };

  const getProperty = (id: string) => {
    console.log('PropertyContext: getProperty called with ID:', id);
    console.log('PropertyContext: Available properties:', properties.map(p => ({ id: p.id, name: p.name })));
    const found = properties.find(property => property.id === id);
    console.log('PropertyContext: Found property:', found);
    return found;
  };

  const updateProperty = async (id: string, propertyUpdate: Partial<Property>) => {
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

      const { error } = await supabase
        .from('properties')
        .update(propertyToUpdate)
        .eq('id', id);

      if (error) {
        console.error('Error updating property:', error);
        toast.error('Failed to update property');
        return;
      }

      setProperties(properties.map(property => 
        property.id === id ? { ...property, ...propertyUpdate } : property
      ));
      
      toast.success('Property updated successfully');
    } catch (err) {
      console.error('Unexpected error updating property:', err);
      toast.error('An unexpected error occurred');
    }
  };

  const deleteProperty = async (id: string) => {
    try {
      if (!currentUser) {
        toast.error('You must be logged in to delete a property');
        return;
      }

      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting property:', error);
        toast.error('Failed to delete property');
        return;
      }

      setProperties(properties.filter(property => property.id !== id));
      
      toast.success('Property deleted successfully');
    } catch (err) {
      console.error('Unexpected error deleting property:', err);
      toast.error('An unexpected error occurred');
    }
  };

  return {
    properties,
    loading,
    loadingFailed,
    addProperty,
    getProperty,
    updateProperty,
    deleteProperty
  };
};
