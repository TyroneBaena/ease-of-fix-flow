
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Property } from '@/types/property';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { useUnifiedAuth } from '../UnifiedAuthContext';
import { PropertyContextType } from './PropertyContextTypes';
import { fetchProperties } from './propertyOperations';
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';

export const usePropertyProvider = (): PropertyContextType => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingFailed, setLoadingFailed] = useState<boolean>(false);
  const { currentUser, isSessionReady } = useUnifiedAuth();
  const lastFetchedUserIdRef = useRef<string | null>(null);
  // CRITICAL: Track if we've completed initial load to prevent loading flashes
  const hasCompletedInitialLoadRef = useRef(false);
  // CRITICAL: Prevent concurrent fetches during rapid tab switches
  const isFetchingRef = useRef(false);
  const fetchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // CRITICAL: Track last fetch time to enable smart refresh on tab visibility
  const lastFetchTimeRef = useRef<number>(0);

  // CRITICAL v55.0: Use refs to access CURRENT auth state (not stale closure)
  const authStateRef = useRef({ isSessionReady, currentUser });
  
  // Update ref whenever auth state changes
  useEffect(() => {
    authStateRef.current = { isSessionReady, currentUser };
  }, [isSessionReady, currentUser]);

  // v77.0: CRITICAL FIX - Subscribe to coordinator's instant reset
  useEffect(() => {
    const unsubscribe = visibilityCoordinator.onTabRefreshChange((isRefreshing) => {
      if (!isRefreshing && hasCompletedInitialLoadRef.current) {
        // Instant reset: Clear loading immediately on tab return
        console.log('⚡ v77.0 - Properties - Instant loading reset from coordinator');
        setLoading(false);
      }
    });
    
    return unsubscribe;
  }, []);

  // CRITICAL v55.0: Stable callback that accesses current values via ref
  const fetchAndSetProperties = useCallback(async () => {
    const { isSessionReady: sessionReady, currentUser: user } = authStateRef.current;
    const userId = user?.id;
    
    console.log('v55.0 - PropertyProvider: fetchAndSetProperties called', { 
      sessionReady, 
      hasUser: !!userId,
      userId 
    });
    
    // CRITICAL: Wait for BOTH session ready AND user available
    if (!sessionReady) {
      console.log('v55.0 - PropertyProvider: Waiting for session ready...');
      return;
    }
    
    if (!userId) {
      console.log('v55.0 - PropertyProvider: No current user, skipping fetch');
      return;
    }
    
    // CRITICAL: Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('v55.0 - PropertyProvider: Fetch already in progress, skipping');
      return;
    }
    
    // CRITICAL FIX: 60-second timeout for RLS queries
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn('⏱️ Properties fetch timeout after 60s');
    }, 60000);

    try {
      // CRITICAL: Only set loading on first fetch to prevent flash on tab switches
      if (!hasCompletedInitialLoadRef.current) {
        setLoading(true);
      }
      setLoadingFailed(false);
      isFetchingRef.current = true;
      console.log('v55.0 - PropertyContext: Fetching properties for user:', userId);
      
      const formattedProperties = await fetchProperties(controller.signal);
      clearTimeout(timeoutId);
      
      console.log('✅ v55.0 - PropertyContext: Properties fetched successfully');
      console.log('v55.0 - PropertyContext: Number of properties:', formattedProperties.length);
      setProperties(formattedProperties);
      lastFetchTimeRef.current = Date.now();
    } catch (err) {
      clearTimeout(timeoutId);
      
      if (controller.signal.aborted) {
        console.warn('❌ Properties fetch aborted due to timeout');
        toast.error('Loading properties timed out. Please refresh.');
      } else {
        console.error('❌ v55.0 - PropertyContext: Error fetching properties:', err);
        toast.error('Failed to load properties');
      }
      setLoadingFailed(true);
    } finally {
      console.log('🏁 v55.0 - PropertyProvider - Resetting loading state');
      // CRITICAL: Only reset loading on first load, keep it false after
      if (!hasCompletedInitialLoadRef.current) {
        setLoading(false);
      }
      hasCompletedInitialLoadRef.current = true;
      isFetchingRef.current = false;
    }
  }, []); // CRITICAL v55.0: Empty deps - callback uses ref for current values

  useEffect(() => {
    console.log('PropertyProvider: useEffect triggered', { 
      currentUser: currentUser ? `User: ${currentUser.email}` : 'No user',
      userId: currentUser?.id,
      lastFetchedUserId: lastFetchedUserIdRef.current,
      isSessionReady
    });
    
    // Clear any pending debounce timers
    if (fetchDebounceTimerRef.current) {
      clearTimeout(fetchDebounceTimerRef.current);
    }
    
    // CRITICAL: Wait for session to be ready
    if (!isSessionReady) {
      console.log('PropertyProvider: Waiting for session ready...');
      return;
    }
    
    // If no user, clear everything
    if (!currentUser?.id) {
      console.log('PropertyProvider: No user, clearing properties');
      setProperties([]);
      setLoading(false);
      setLoadingFailed(false);
      lastFetchedUserIdRef.current = null;
      hasCompletedInitialLoadRef.current = true;
      isFetchingRef.current = false;
      return;
    }
    
    // Only fetch if the user ID has actually changed
    if (lastFetchedUserIdRef.current === currentUser.id) {
      console.log('PropertyProvider: User ID unchanged, skipping fetch');
      return;
    }
    
    console.log('PropertyProvider: User ID changed, debouncing fetch');
    lastFetchedUserIdRef.current = currentUser.id;
    
    // CRITICAL: Debounce rapid tab switches (300ms delay)
    fetchDebounceTimerRef.current = setTimeout(() => {
      fetchAndSetProperties();
    }, 300);
    
    return () => {
      if (fetchDebounceTimerRef.current) {
        clearTimeout(fetchDebounceTimerRef.current);
      }
    };
  }, [currentUser?.id, isSessionReady, fetchAndSetProperties]);

  // CRITICAL v55.0: Register handler ONCE on mount with proper cleanup
  useEffect(() => {
    console.log('🔄 v55.0 - PropertyProvider - Registering handler (once on mount)');

    const refreshProperties = async () => {
      console.log('🔄 v55.0 - PropertyProvider - Coordinator-triggered refresh');
      await fetchAndSetProperties();
    };

    const unregister = visibilityCoordinator.onRefresh(refreshProperties);
    console.log('🔄 v55.0 - PropertyProvider - Handler registered');

    return () => {
      console.log('🔄 v55.0 - PropertyProvider - Cleanup: Unregistering handler');
      unregister();
      console.log('🔄 v55.0 - PropertyProvider - Cleanup complete');
    };
  }, [fetchAndSetProperties]);


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
  }, [currentUser?.id]);

  const getProperty = useCallback((id: string): Property | undefined => {
    console.log('PropertyContext: getProperty called with ID:', id);
    console.log('PropertyContext: Available properties:', properties.map(p => ({ id: p.id, name: p.name })));
    const foundProperty = properties.find(property => property.id === id);
    console.log('PropertyContext: Found property:', foundProperty);
    return foundProperty;
  }, [properties]);

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

      setProperties(prev => prev.map(property => 
        property.id === id ? { ...property, ...propertyUpdate } : property
      ));
      
      console.log('PropertyContext: Local state updated');
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
  }, [currentUser?.id]);

  return useMemo(() => ({
    properties,
    // CRITICAL: Override loading to false after initial load completes
    // This prevents loading flashes on tab switches
    loading: hasCompletedInitialLoadRef.current ? false : loading,
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
