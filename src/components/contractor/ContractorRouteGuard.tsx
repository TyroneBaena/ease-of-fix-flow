import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import { toast } from '@/lib/toast';

interface ContractorRouteGuardProps {
  children: React.ReactNode;
}

export const ContractorRouteGuard: React.FC<ContractorRouteGuardProps> = ({ children }) => {
  const { currentUser, loading } = useSimpleAuth();
  const [checkingContractor, setCheckingContractor] = useState(true);
  const [hasContractorProfile, setHasContractorProfile] = useState(false);

  // Check if user has contractor profile in contractors table
  useEffect(() => {
    const checkContractorProfile = async () => {
      if (!currentUser) {
        setCheckingContractor(false);
        return;
      }

      if (currentUser.role !== 'contractor') {
        setCheckingContractor(false);
        return;
      }

      try {
        const { data: contractor, error } = await supabase
          .from('contractors')
          .select('id')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking contractor profile:', error);
          setHasContractorProfile(false);
        } else {
          setHasContractorProfile(!!contractor);
          if (!contractor) {
            toast.error('Contractor profile not found. Please contact your administrator.');
          }
        }
      } catch (error) {
        console.error('Error in contractor profile check:', error);
        setHasContractorProfile(false);
      } finally {
        setCheckingContractor(false);
      }
    };

    checkContractorProfile();
  }, [currentUser?.id, currentUser?.role]);

  console.log('🔒 ContractorRouteGuard - State:', { 
    currentUser: !!currentUser, 
    role: currentUser?.role,
    loading,
    checkingContractor,
    hasContractorProfile
  });

  // Show loading while authentication is in progress
  if (loading || checkingContractor) {
    console.log('🔒 ContractorRouteGuard - Showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    console.log("🔒 ContractorRouteGuard: User not authenticated, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  // Allow admin users (for testing/admin purposes)
  if (currentUser.role === 'admin') {
    console.log("🔒 ContractorRouteGuard: Admin user accessing contractor routes");
    return <>{children}</>;
  }

  // Check if user has contractor role but no contractor profile
  if (currentUser.role === 'contractor' && !hasContractorProfile) {
    console.log("🔒 ContractorRouteGuard: User has contractor role but no contractor profile, redirecting to dashboard");
    return <Navigate to="/dashboard" replace />;
  }

  // Check if user is a contractor
  if (currentUser.role !== 'contractor') {
    console.log(`🔒 ContractorRouteGuard: User role '${currentUser.role}' not authorized for contractor routes`);
    return <Navigate to="/dashboard" replace />;
  }

  console.log('🔒 ContractorRouteGuard - Rendering contractor content for user:', currentUser.email);
  return <>{children}</>;
};