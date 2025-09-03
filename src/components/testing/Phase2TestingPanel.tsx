import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building2, 
  Users, 
  Shield, 
  Database,
  RefreshCw
} from 'lucide-react';
import { useUserContext } from '@/contexts/UserContext';
import { useMultiOrganizationContext } from '@/contexts/MultiOrganizationContext';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'pending';
  message: string;
  details?: string;
}

export const Phase2TestingPanel: React.FC = () => {
  const { currentUser } = useUserContext();
  const multiOrgContext = useMultiOrganizationContext();
  const orgContext = useOrganizationContext();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    const results: TestResult[] = [];

    // Test 1: Multi-Organization Context Available
    try {
      results.push({
        name: 'Multi-Organization Context',
        status: multiOrgContext ? 'pass' : 'fail',
        message: multiOrgContext ? 'Context is available' : 'Context not available',
        details: `Organizations: ${multiOrgContext?.userOrganizations?.length || 0}`
      });
    } catch (error) {
      results.push({
        name: 'Multi-Organization Context',
        status: 'fail',
        message: 'Error accessing context',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 2: Current Organization Loading
    results.push({
      name: 'Current Organization',
      status: multiOrgContext?.currentOrganization ? 'pass' : 'fail',
      message: multiOrgContext?.currentOrganization 
        ? `Loaded: ${multiOrgContext.currentOrganization.name}` 
        : 'No current organization',
      details: `Loading: ${multiOrgContext?.loading}`
    });

    // Test 3: Organization Switching Function
    results.push({
      name: 'Organization Switching',
      status: typeof multiOrgContext?.switchOrganization === 'function' ? 'pass' : 'fail',
      message: typeof multiOrgContext?.switchOrganization === 'function' 
        ? 'Switch function available' 
        : 'Switch function not available'
    });

    // Test 4: User Organizations List
    const userOrgsCount = multiOrgContext?.userOrganizations?.length || 0;
    results.push({
      name: 'User Organizations',
      status: userOrgsCount > 0 ? 'pass' : 'fail',
      message: `Found ${userOrgsCount} organization(s)`,
      details: multiOrgContext?.userOrganizations?.map(uo => 
        `${uo.organization.name} (${uo.role})`
      ).join(', ')
    });

    // Test 5: Role Management
    const currentRole = multiOrgContext?.getCurrentUserRole();
    results.push({
      name: 'Role Management',
      status: currentRole ? 'pass' : 'fail',
      message: currentRole ? `Current role: ${currentRole}` : 'No role detected',
      details: `User role: ${currentUser?.role}`
    });

    // Test 6: Database Functions
    try {
      const { data, error } = await supabase.rpc('get_current_user_organization');
      results.push({
        name: 'Database Functions',
        status: !error ? 'pass' : 'fail',
        message: !error ? 'Organization function works' : 'Function error',
        details: error?.message || `Org ID: ${data}`
      });
    } catch (error) {
      results.push({
        name: 'Database Functions',
        status: 'fail',
        message: 'Error calling function',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 7: Session Management
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('session_organization_id')
        .eq('id', currentUser?.id)
        .single();

      results.push({
        name: 'Session Management',
        status: !error ? 'pass' : 'fail',
        message: !error ? 'Session org tracked' : 'Session tracking error',
        details: error?.message || `Session Org: ${data?.session_organization_id}`
      });
    } catch (error) {
      results.push({
        name: 'Session Management',
        status: 'fail',
        message: 'Error checking session',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test 8: Legacy Compatibility
    results.push({
      name: 'Legacy Compatibility',
      status: orgContext?.currentOrganization ? 'pass' : 'fail',
      message: orgContext?.currentOrganization 
        ? 'Legacy context works' 
        : 'Legacy context broken',
      details: `Org: ${orgContext?.currentOrganization?.name}`
    });

    setTestResults(results);
    setTesting(false);

    const passCount = results.filter(r => r.status === 'pass').length;
    const totalCount = results.length;
    
    if (passCount === totalCount) {
      toast.success(`All ${totalCount} tests passed!`);
    } else {
      toast.error(`${totalCount - passCount} tests failed`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pass': return <Badge variant="default" className="bg-green-100 text-green-800">Pass</Badge>;
      case 'fail': return <Badge variant="destructive">Fail</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Phase 2 Integration Testing</span>
        </CardTitle>
        <CardDescription>
          Test multi-organization features and integration with Phase 1
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Controls */}
        <div className="flex justify-between items-center">
          <Button 
            onClick={runTests} 
            disabled={testing}
            className="flex items-center space-x-2"
          >
            {testing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Running Tests...</span>
              </>
            ) : (
              <>
                <Database className="h-4 w-4" />
                <span>Run All Tests</span>
              </>
            )}
          </Button>
          
          {testResults.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>
                {testResults.filter(r => r.status === 'pass').length} / {testResults.length} passed
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Current State Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Current User</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {currentUser?.name || 'Not loaded'} ({currentUser?.role || 'No role'})
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Current Organization</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {multiOrgContext?.currentOrganization?.name || 'Not loaded'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Organizations</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {multiOrgContext?.userOrganizations?.length || 0} available
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Test Results</h3>
            {testResults.map((result, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                {getStatusIcon(result.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{result.name}</p>
                    {getStatusBadge(result.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                  {result.details && (
                    <p className="text-xs text-muted-foreground mt-1">{result.details}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};