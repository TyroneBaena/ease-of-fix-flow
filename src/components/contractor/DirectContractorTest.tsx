import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const DirectContractorTest = () => {
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runDirectTest = async () => {
    setLoading(true);
    try {
      console.log('DirectContractorTest - Starting direct contractor test...');

      // Step 1: Get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('DirectContractorTest - Session:', { session, sessionError });

      // Step 2: Direct contractor query by email (bypass RLS if needed)
      const { data: contractorByEmail, error: contractorError } = await supabase
        .from('contractors')
        .select('*')
        .eq('email', 'qolorily@forexnews.bg')
        .maybeSingle();

      console.log('DirectContractorTest - Contractor by email:', { contractorByEmail, contractorError });

      // Step 3: Direct maintenance request query
      const { data: maintenanceRequests, error: requestsError } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('contractor_id', 'd2c10af6-f0c0-4249-8665-87a71c23835f');

      console.log('DirectContractorTest - Maintenance requests:', { maintenanceRequests, requestsError });

      // Step 4: Check if user_id matches session
      const userIdMatch = session?.user?.id === contractorByEmail?.user_id;

      setTestResults({
        session: {
          exists: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
          error: sessionError?.message
        },
        contractor: {
          found: !!contractorByEmail,
          id: contractorByEmail?.id,
          company: contractorByEmail?.company_name,
          userId: contractorByEmail?.user_id,
          orgId: contractorByEmail?.organization_id,
          error: contractorError?.message
        },
        requests: {
          count: maintenanceRequests?.length || 0,
          data: maintenanceRequests,
          error: requestsError?.message
        },
        validation: {
          userIdMatch,
          sessionValid: !!session && !!session.user,
          contractorValid: !!contractorByEmail,
          hasRequests: (maintenanceRequests?.length || 0) > 0
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('DirectContractorTest - Error:', error);
      setTestResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto m-4">
      <CardHeader>
        <CardTitle>Direct Contractor Test</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={runDirectTest} disabled={loading} className="mb-4">
          {loading ? 'Testing...' : 'Run Direct Contractor Test'}
        </Button>
        
        <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
          {JSON.stringify(testResults, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
};