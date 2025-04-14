
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
  const { currentUser } = useUserContext();
  const [fetchAttempted, setFetchAttempted] = useState(false);

  // Set a safeguard to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading && !fetchAttempted) {
        console.log('PropertyContext: Safeguard timeout triggered, setting loading to false');
        setLoading(false);
      }
    }, 3000); // 3 seconds timeout

    return () => clearTimeout(timer);
  }, [loading, fetchAttempted]);

  useEffect(() => {
    // Only fetch if we have a user - add a slight delay to prevent race conditions
    if (currentUser) {
      const timer = setTimeout(() => {
        fetchAndSetProperties();
      }, 100);
      
      return () => clearTimeout(timer);
    } else {
      setProperties([]);
      setLoading(false);
    }
  }, [currentUser]);

  // Fetch properties from database
  const fetchAndSetProperties = async () => {
    try {
      setLoading(true);
      setFetchAttempted(true);
      console.log('PropertyContext: Fetching properties');
      
      const formattedProperties = await fetchProperties();
      
      console.log('PropertyContext: Properties fetched successfully', formattedProperties.length);
      setProperties(formattedProperties);
    } catch (err) {
      console.error('Unexpected error fetching properties:', err);
      toast.error('An unexpected error occurred');
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
        user_id: currentUser.id
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

      const newProperty: Property = {
        id: data.id,
        name: data.name,
        address: data.address,
        contactNumber: data.contact_number,
        email: data.email,
        practiceLeader: data.practice_leader,
        practiceLeaderEmail: data.practice_leader_email || '',
        practiceLeaderPhone: data.practice_leader_phone || '',
        renewalDate: data.renewal_date ? new Date(data.renewal_date).toISOString() : '',
        rentAmount: Number(data.rent_amount) || 0,
        createdAt: data.created_at
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
    return properties.find(property => property.id === id);
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
    addProperty,
    getProperty,
    updateProperty,
    deleteProperty
  };
};
