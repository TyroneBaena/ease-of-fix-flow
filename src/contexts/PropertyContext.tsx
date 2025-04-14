
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Property } from '../types/property';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { useUserContext } from './UserContext';

interface PropertyContextType {
  properties: Property[];
  loading: boolean;
  addProperty: (property: Omit<Property, 'id' | 'createdAt'>) => Promise<Property | undefined>;
  getProperty: (id: string) => Property | undefined;
  updateProperty: (id: string, property: Partial<Property>) => Promise<void>;
  deleteProperty: (id: string) => Promise<void>;
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const usePropertyContext = () => {
  const context = useContext(PropertyContext);
  if (!context) {
    throw new Error('usePropertyContext must be used within a PropertyProvider');
  }
  return context;
};

export const PropertyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { currentUser } = useUserContext();

  useEffect(() => {
    if (currentUser) {
      fetchProperties();
    } else {
      setProperties([]);
      setLoading(false);
    }
  }, [currentUser]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*');

      if (error) {
        console.error('Error fetching properties:', error);
        toast.error('Failed to fetch properties');
        return;
      }

      const formattedProperties: Property[] = data.map(prop => ({
        id: prop.id,
        name: prop.name,
        address: prop.address,
        contactNumber: prop.contact_number,
        email: prop.email,
        practiceLeader: prop.practice_leader,
        practiceLeaderEmail: prop.practice_leader_email || '',
        practiceLeaderPhone: prop.practice_leader_phone || '',
        renewalDate: prop.renewal_date ? new Date(prop.renewal_date).toISOString() : '',
        rentAmount: Number(prop.rent_amount) || 0,
        createdAt: prop.created_at
      }));

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

  return (
    <PropertyContext.Provider value={{
      properties,
      loading,
      addProperty,
      getProperty,
      updateProperty,
      deleteProperty
    }}>
      {children}
    </PropertyContext.Provider>
  );
};
