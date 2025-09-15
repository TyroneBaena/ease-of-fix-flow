import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const SessionDebugger = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const checkSession = async () => {
    setLoading(true);
    try {
      // Check session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // Check user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      // Test database access with current session
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      // Test contractor access
      const { data: contractorData, error: contractorError } = await supabase
        .from('contractors')
        .select('*')
        .eq('email', 'qolorily@forexnews.bg')
        .limit(1);
      
      setDebugInfo({
        session: {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
          accessToken: session?.access_token ? 'present' : 'missing',
          expiresAt: session?.expires_at,
          error: sessionError
        },
        user: {
          hasUser: !!user,
          userId: user?.id,
          email: user?.email,
          error: userError
        },
        profileAccess: {
          canAccess: !profileError,
          recordCount: profileData?.length || 0,
          error: profileError?.message
        },
        contractorAccess: {
          canAccess: !contractorError,
          recordCount: contractorData?.length || 0,
          error: contractorError?.message,
          contractorData: contractorData?.[0]
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Session debug error:', error);
      setDebugInfo({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto m-4">
      <CardHeader>
        <CardTitle>Session Debugger</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={checkSession} disabled={loading} className="mb-4">
          {loading ? 'Checking...' : 'Check Session & Database Access'}
        </Button>
        
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
};