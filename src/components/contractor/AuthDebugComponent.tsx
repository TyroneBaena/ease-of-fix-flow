import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const AuthDebugComponent = () => {
  const [authState, setAuthState] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const checkAuthState = async () => {
    setLoading(true);
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      // Test database queries
      const { data: dbAuthTest } = await supabase.rpc('debug_organization_context');
      
      // Check contractor profile
      const { data: contractorProfile, error: contractorError } = await supabase
        .from('contractors')
        .select('*')
        .eq('email', 'jijezu@forexzig.com')
        .maybeSingle();

      setAuthState({
        session: {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
        },
        dbAuthTest,
        contractorProfile,
        contractorError,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Auth debug error:', error);
      setAuthState({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthState();
  }, []);

  return (
    <Card className="max-w-2xl mx-auto m-4">
      <CardHeader>
        <CardTitle>Authentication Debug</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={checkAuthState} disabled={loading} className="mb-4">
          {loading ? 'Checking...' : 'Check Auth State'}
        </Button>
        
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
          {JSON.stringify(authState, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
};