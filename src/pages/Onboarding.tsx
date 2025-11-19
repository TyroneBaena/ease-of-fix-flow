import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { OrganizationOnboarding } from '@/components/auth/OrganizationOnboarding';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from 'lucide-react';

const Onboarding = () => {
  const navigate = useNavigate();
  const { currentUser, loading } = useUnifiedAuth();
  const [searchParams] = useSearchParams();
  const invitationCode = searchParams.get('code') || undefined;
  const [isPolling, setIsPolling] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [pollStartTime, setPollStartTime] = useState<number | null>(null);

  // Poll to check if user has completed onboarding (both org AND payment method)
  useEffect(() => {
    if (!currentUser?.id || !isPolling) return;

    // Set poll start time
    if (!pollStartTime) {
      setPollStartTime(Date.now());
    }

    const pollInterval = setInterval(async () => {
      try {
        // Check for timeout (30 seconds)
        if (pollStartTime && Date.now() - pollStartTime > 30000) {
          console.error('⏰ Polling timeout - onboarding incomplete');
          clearInterval(pollInterval);
          setIsPolling(false);
          return;
        }

        console.log('🔄 Polling for organization AND payment method completion...');
        
        // Check profile has organization_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', currentUser.id)
          .single();

        // Check subscriber has payment_method_id
        const { data: subscriber } = await supabase
          .from('subscribers')
          .select('payment_method_id')
          .eq('user_id', currentUser.id)
          .single();

        console.log('📊 Poll results:', { 
          hasOrgId: !!profile?.organization_id,
          hasPaymentMethod: !!subscriber?.payment_method_id 
        });

        // Only complete when BOTH are present
        if (profile?.organization_id && subscriber?.payment_method_id) {
          console.log('✅ Both organization AND payment method confirmed!');
          clearInterval(pollInterval);
          setIsPolling(false);
          setShowSuccessMessage(true);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [currentUser?.id, isPolling, pollStartTime]);

  const handleComplete = () => {
    console.log('✅ Onboarding complete - starting polling');
    setIsPolling(true);
  };

  const handleLoginRedirect = () => {
    navigate('/login', { replace: true });
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

  // Show success message after onboarding is complete
  if (showSuccessMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Signup Successful!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Your organization has been set up successfully. Please log in to access your dashboard.
            </p>
            <Button onClick={handleLoginRedirect} className="w-full" size="lg">
              Continue to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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
