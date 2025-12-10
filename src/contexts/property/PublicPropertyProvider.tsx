import React, { createContext, useContext, useState, useEffect } from 'react';
import { Property } from '@/types/property';
import { BudgetCategory } from '@/types/budget';
import { useSearchParams } from 'react-router-dom';

interface PublicHousemate {
  id: string;
  firstName: string;
  lastName: string;
}

interface PublicPropertyContextType {
  properties: Property[];
  budgetCategories: BudgetCategory[];
  housemates: PublicHousemate[];
  loading: boolean;
  error: string | null;
}

const PublicPropertyContext = createContext<PublicPropertyContextType | undefined>(undefined);

export const PublicPropertyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('propertyId');
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [housemates, setHousemates] = useState<PublicHousemate[]>([]);
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

      console.log('🔍 [DEBUG] PublicPropertyProvider: Fetching data for property:', propertyId);
      console.log('🔍 [DEBUG] PublicPropertyProvider: Current search params:', searchParams.toString());

      // Fetch property and budget categories via edge function
      const url = `https://ltjlswzrdgtoddyqmydo.supabase.co/functions/v1/get-public-property-data?propertyId=${encodeURIComponent(propertyId!)}`;
      console.log('🌐 [DEBUG] PublicPropertyProvider: Calling URL:', url);
      
      const response = await fetch(url);
      console.log('📡 [DEBUG] PublicPropertyProvider: Response status:', response.status);
      
      const result = await response.json();
      console.log('📦 [DEBUG] PublicPropertyProvider: Full response:', JSON.stringify(result, null, 2));

      if (!response.ok || result.error) {
        console.error('❌ [DEBUG] PublicPropertyProvider: Error fetching data:', result.error);
        setError(result.error || 'Failed to load property data');
        return;
      }

      console.log('✅ [DEBUG] PublicPropertyProvider: Data loaded successfully');
      console.log('🏠 [DEBUG] PublicPropertyProvider: Property:', result.property);
      console.log('📊 [DEBUG] PublicPropertyProvider: Budget categories count:', result.budgetCategories?.length || 0);
      console.log('👥 [DEBUG] PublicPropertyProvider: Housemates count:', result.housemates?.length || 0);

      if (result.property) {
        console.log('✅ [DEBUG] PublicPropertyProvider: Setting property:', result.property.name);
        setProperties([result.property]);
      } else {
        console.log('❌ [DEBUG] PublicPropertyProvider: No property in result');
        setProperties([]);
      }
      
      if (result.budgetCategories) {
        console.log('✅ [DEBUG] PublicPropertyProvider: Setting budget categories:', result.budgetCategories.length);
        setBudgetCategories(result.budgetCategories);
      } else {
        console.log('❌ [DEBUG] PublicPropertyProvider: No budget categories in result');
        setBudgetCategories([]);
      }

      if (result.housemates) {
        console.log('✅ [DEBUG] PublicPropertyProvider: Setting housemates:', result.housemates.length);
        setHousemates(result.housemates);
      } else {
        console.log('❌ [DEBUG] PublicPropertyProvider: No housemates in result');
        setHousemates([]);
      }

    } catch (error) {
      console.error('❌ [DEBUG] PublicPropertyProvider: Unexpected error:', error);
      console.error('❌ [DEBUG] PublicPropertyProvider: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      setError('Something went wrong while loading property data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicPropertyContext.Provider value={{
      properties,
      budgetCategories,
      housemates,
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