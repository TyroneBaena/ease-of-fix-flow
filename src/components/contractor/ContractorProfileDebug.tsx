import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast';

interface DebugInfo {
  authUser: any;
  profileData: any;
  contractorData: any;
  userContextData: any;
}

export const ContractorProfileDebug = () => {
  const { currentUser } = useUserContext();
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const runDebug = async () => {
    setLoading(true);
    try {
      // Get auth user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      // Get profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser?.id)
        .maybeSingle();

      // Get contractor data
      const { data: contractorData, error: contractorError } = await supabase
        .from('contractors')
        .select('*')
        .eq('user_id', authUser?.id);

      const debug: DebugInfo = {
        authUser: authUser ? {
          id: authUser.id,
          email: authUser.email,
          role: authUser.user_metadata?.role,
          created_at: authUser.created_at
        } : null,
        profileData: profileError ? { error: profileError } : profileData,
        contractorData: contractorError ? { error: contractorError } : contractorData,
        userContextData: currentUser ? {
          id: currentUser.id,
          email: currentUser.email,
          role: currentUser.role,
          organization_id: currentUser.organization_id
        } : null
      };

      setDebugInfo(debug);
      console.log('Debug Info:', debug);
    } catch (error) {
      console.error('Debug error:', error);
      toast.error('Debug failed');
    } finally {
      setLoading(false);
    }
  };

  const fixRole = async () => {
    if (!debugInfo?.authUser?.id) {
      toast.error('No auth user found');
      return;
    }

    try {
      // Update profile role to contractor
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'contractor' })
        .eq('id', debugInfo.authUser.id);

      if (error) throw error;

      toast.success('Role updated to contractor');
      // Trigger a page refresh to reload user data
      window.location.reload();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  useEffect(() => {
    runDebug();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Contractor Profile Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={runDebug} disabled={loading}>
              {loading ? 'Running Debug...' : 'Run Debug'}
            </Button>
            
            {debugInfo && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">Auth User:</h3>
                  <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                    {JSON.stringify(debugInfo.authUser, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h3 className="font-semibold">Profile Data:</h3>
                  <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                    {JSON.stringify(debugInfo.profileData, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h3 className="font-semibold">Contractor Data:</h3>
                  <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                    {JSON.stringify(debugInfo.contractorData, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h3 className="font-semibold">User Context Data:</h3>
                  <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
                    {JSON.stringify(debugInfo.userContextData, null, 2)}
                  </pre>
                </div>

                {debugInfo.profileData?.role !== 'contractor' && debugInfo.contractorData?.length > 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-yellow-800 font-semibold mb-2">
                      Issue Found: User has contractor record but profile role is not 'contractor'
                    </p>
                    <p className="text-yellow-700 mb-3">
                      Current role: {debugInfo.profileData?.role || 'unknown'}
                    </p>
                    <Button onClick={fixRole} variant="outline">
                      Fix Role (Set to Contractor)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};