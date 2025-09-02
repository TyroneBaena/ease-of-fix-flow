import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useUserContext } from '@/contexts/UserContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const DebugAuthStatus = () => {
  const [dbAuthStatus, setDbAuthStatus] = useState<any>(null);
  const [manualSessionCheck, setManualSessionCheck] = useState<any>(null);
  const { currentUser, session, loading } = useSupabaseAuth();
  const { currentUser: contextUser, isAdmin, loading: contextLoading } = useUserContext();

  const checkDatabaseAuth = async () => {
    try {
      const { data, error } = await supabase.rpc('test_logging');
      console.log('Database function test:', { data, error });
      
      const authQuery = await supabase
        .from('profiles')
        .select('id, email, name, role, organization_id')
        .limit(1);
      
      console.log('Profile query result:', authQuery);
      setDbAuthStatus(authQuery);
    } catch (error) {
      console.error('Database auth check failed:', error);
      setDbAuthStatus({ error: error.message });
    }
  };

  const forceSessionRefresh = async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      console.log('Session refresh result:', { data, error });
      setManualSessionCheck(data);
    } catch (error) {
      console.error('Session refresh failed:', error);
      setManualSessionCheck({ error: error.message });
    }
  };

  const checkCurrentSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('Current session check:', { session, error });
      setManualSessionCheck({ session, error });
    } catch (error) {
      console.error('Session check failed:', error);
      setManualSessionCheck({ error: error.message });
    }
  };

  useEffect(() => {
    checkDatabaseAuth();
    checkCurrentSession();
  }, []);

  return (
    <Card className="mb-6 border-red-200">
      <CardHeader>
        <CardTitle className="text-red-700">🔍 Authentication Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold">useSupabaseAuth Hook:</h3>
            <pre className="text-xs bg-gray-100 p-2 rounded">
              {JSON.stringify({
                currentUser: currentUser ? {
                  id: currentUser.id,
                  email: currentUser.email,
                  role: currentUser.role
                } : null,
                session: session ? 'exists' : 'null',
                loading
              }, null, 2)}
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold">UserContext:</h3>
            <pre className="text-xs bg-gray-100 p-2 rounded">
              {JSON.stringify({
                currentUser: contextUser ? {
                  id: contextUser.id,
                  email: contextUser.email,
                  role: contextUser.role
                } : null,
                isAdmin,
                loading: contextLoading
              }, null, 2)}
            </pre>
          </div>
        </div>

        <div>
          <h3 className="font-semibold">Database Auth Status:</h3>
          <pre className="text-xs bg-gray-100 p-2 rounded">
            {JSON.stringify(dbAuthStatus, null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="font-semibold">Manual Session Check:</h3>
          <pre className="text-xs bg-gray-100 p-2 rounded">
            {JSON.stringify(manualSessionCheck, null, 2)}
          </pre>
        </div>

        <div className="flex gap-2">
          <Button onClick={checkDatabaseAuth} variant="outline" size="sm">
            Recheck DB Auth
          </Button>
          <Button onClick={checkCurrentSession} variant="outline" size="sm">
            Check Session
          </Button>
          <Button onClick={forceSessionRefresh} variant="outline" size="sm">
            Force Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DebugAuthStatus;