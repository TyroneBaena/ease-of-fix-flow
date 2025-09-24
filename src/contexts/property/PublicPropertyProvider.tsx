import React, { createContext, useContext, useState, useEffect } from 'react';
import { Property } from '@/types/property';
import { BudgetCategory } from '@/types/budget';
import { useSearchParams } from 'react-router-dom';

interface PublicPropertyContextType {
  properties: Property[];
  budgetCategories: BudgetCategory[];
  loading: boolean;
  error: string | null;
}

const PublicPropertyContext = createContext<PublicPropertyContextType | undefined>(undefined);

export const PublicPropertyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('propertyId');
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propertyId) {
      fetchPublicPropertyData();
    }
  }, [propertyId]);

  const fetchPublicPropertyData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 PublicPropertyProvider: Fetching data for property:', propertyId);

      // Fetch property and budget categories via edge function
      const response = await fetch(`https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/get-public-property-data?propertyId=${encodeURIComponent(propertyId!)}`);
      const result = await response.json();

      if (!response.ok || result.error) {
        console.error('❌ Error fetching public property data:', result.error);
        setError(result.error || 'Failed to load property data');
        return;
      }

      console.log('✅ PublicPropertyProvider: Data loaded:', result);

      if (result.property) {
        setProperties([result.property]);
      }
      
      if (result.budgetCategories) {
        setBudgetCategories(result.budgetCategories);
      }

    } catch (error) {
      console.error('❌ PublicPropertyProvider: Unexpected error:', error);
      setError('Something went wrong while loading property data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicPropertyContext.Provider value={{
      properties,
      budgetCategories,
      loading,
      error
    }}>
      {children}
    </PublicPropertyContext.Provider>
  );
};

export const usePublicPropertyContext = () => {
  const context = useContext(PublicPropertyContext);
  if (!context) {
    throw new Error('usePublicPropertyContext must be used within a PublicPropertyProvider');
  }
  return context;
};