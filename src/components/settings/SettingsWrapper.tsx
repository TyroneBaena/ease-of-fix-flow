import React from 'react';
import { useSimpleAuth } from '@/contexts/UnifiedAuthContext';
import Settings from '@/pages/Settings';
import { User } from '@/types/user';

/**
 * SettingsWrapper - Bridge component that connects UnifiedAuthProvider context to Settings page
 * 
 * Purpose:
 * - Consumes data from UnifiedAuthProvider (currentUser, loading)
 * - Passes this data as props to Settings component
 * - Eliminates duplicate profile API calls by reusing auth provider's data
 * 
 * Architecture:
 * UnifiedAuthProvider → SettingsWrapper → Settings (props-based)
 */
const SettingsWrapper: React.FC = () => {
  const { currentUser, loading } = useSimpleAuth();

  return <Settings currentUser={currentUser} loading={loading} />;
};

export default SettingsWrapper;
