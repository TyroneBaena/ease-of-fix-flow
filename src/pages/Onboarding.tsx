import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OrganizationOnboarding } from '@/components/auth/OrganizationOnboarding';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { Loader2 } from 'lucide-react';

const Onboarding = () => {
  const navigate = useNavigate();
  const { currentUser, loading } = useUnifiedAuth();
  const [searchParams] = useSearchParams();
  const invitationCode = searchParams.get('code') || undefined;

  const handleComplete = () => {
    console.log('✅ Onboarding complete - navigating to dashboard');
    navigate('/dashboard', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser) {
    navigate('/login', { replace: true });
    return null;
  }

  return (
    <OrganizationOnboarding
      user={currentUser}
      onComplete={handleComplete}
      initialInvitationCode={invitationCode}
    />
  );
};

export default Onboarding;
