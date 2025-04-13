
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Property, MaintenanceRequest } from '../types/property';

interface PropertyContextType {
  properties: Property[];
  addProperty: (property: Omit<Property, 'id' | 'createdAt'>) => void;
  getProperty: (id: string) => Property | undefined;
  updateProperty: (id: string, property: Partial<Property>) => void;
  deleteProperty: (id: string) => void;
  getRequestsForProperty: (propertyId: string) => MaintenanceRequest[];
  addRequestToProperty: (request: Omit<MaintenanceRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => void;
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
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);

  const addProperty = (property: Omit<Property, 'id' | 'createdAt'>) => {
    const newProperty: Property = {
      ...property,
      id: Math.random().toString(36).substring(2, 11),
      createdAt: new Date().toISOString(),
    };
    setProperties([...properties, newProperty]);
    return newProperty;
  };

  const getProperty = (id: string) => {
    return properties.find(property => property.id === id);
  };

  const updateProperty = (id: string, propertyUpdate: Partial<Property>) => {
    setProperties(properties.map(property => 
      property.id === id ? { ...property, ...propertyUpdate } : property
    ));
  };

  const deleteProperty = (id: string) => {
    setProperties(properties.filter(property => property.id !== id));
    // Also remove associated requests
    setRequests(requests.filter(request => request.propertyId !== id));
  };

  const getRequestsForProperty = (propertyId: string) => {
    return requests.filter(request => request.propertyId === propertyId);
  };

  const addRequestToProperty = (requestData: Omit<MaintenanceRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newRequest: MaintenanceRequest = {
      ...requestData,
      id: Math.random().toString(36).substring(2, 11),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    setRequests([...requests, newRequest]);
    return newRequest;
  };

  return (
    <PropertyContext.Provider value={{
      properties,
      addProperty,
      getProperty,
      updateProperty,
      deleteProperty,
      getRequestsForProperty,
      addRequestToProperty
    }}>
      {children}
    </PropertyContext.Provider>
  );
};
