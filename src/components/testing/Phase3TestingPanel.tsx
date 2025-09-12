import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Users, 
  Building2, 
  Shield,
  TestTube
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UserContext';
import { useMultiOrganizationContext } from '@/contexts/MultiOrganizationContext';
import { validateUserOrganizationAccess, checkUserHasOrganization } from '@/utils/organizationValidation';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  details?: string;
}

export const Phase3TestingPanel: React.FC = () => {
  const { currentUser } = useUserContext();
  const { currentOrganization, userOrganizations } = useMultiOrganizationContext();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const runPhase3Tests = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Test 1: User Authentication
    addTestResult({
      name: 'User Authentication',
      status: currentUser ? 'pass' : 'fail',
      message: currentUser ? `User authenticated: ${currentUser.email}` : 'User not authenticated'
    });

    if (!currentUser) {
      setIsRunning(false);
      return;
    }

    // Test 2: Organization Membership Check
    try {
      const hasOrg = await checkUserHasOrganization(currentUser.id);
      addTestResult({
        name: 'Organization Membership',
        status: hasOrg ? 'pass' : 'fail',
        message: hasOrg ? 'User has organization membership' : 'User missing organization membership',
        details: hasOrg ? `Organization ID: ${currentUser.organization_id}` : 'User should be redirected to organization setup'
      });
    } catch (error) {
      addTestResult({
        name: 'Organization Membership',
        status: 'fail',
        message: 'Error checking organization membership',
        details: (error as Error).message
      });
    }

    // Test 3: Current Organization Context
    addTestResult({
      name: 'Current Organization Context',
      status: currentOrganization ? 'pass' : 'fail',
      message: currentOrganization ? `Current org: ${currentOrganization.name}` : 'No current organization set',
      details: currentOrganization ? `ID: ${currentOrganization.id}` : 'Organization context not loaded'
    });

    // Test 4: User Organizations List
    addTestResult({
      name: 'User Organizations List',
      status: userOrganizations.length > 0 ? 'pass' : 'warning',
      message: `Found ${userOrganizations.length} organization(s)`,
      details: userOrganizations.map(uo => `${uo.organization.name} (${uo.role})`).join(', ')
    });

    // Test 5: Organization Access Validation
    if (currentUser.organization_id && currentOrganization) {
      try {
        const hasAccess = await validateUserOrganizationAccess(currentUser.id, currentOrganization.id);
        addTestResult({
          name: 'Organization Access Validation',
          status: hasAccess ? 'pass' : 'fail',
          message: hasAccess ? 'User has valid access to current organization' : 'User access validation failed',
          details: `Checking access to ${currentOrganization.name}`
        });
      } catch (error) {
        addTestResult({
          name: 'Organization Access Validation',
          status: 'fail',
          message: 'Error validating organization access',
          details: (error as Error).message
        });
      }
    }

    // Test 6: Data Isolation Check
    try {
      const { data: requests, error } = await supabase
        .from('maintenance_requests')
        .select('id, organization_id')
        .limit(5);

      if (error) {
        addTestResult({
          name: 'Data Isolation Check',
          status: 'fail',
          message: 'Error accessing maintenance requests',
          details: error.message
        });
      } else {
        const allSameOrg = requests.every(req => req.organization_id === currentUser.organization_id);
        addTestResult({
          name: 'Data Isolation Check',
          status: allSameOrg ? 'pass' : 'fail',
          message: allSameOrg ? 'All data belongs to user\'s organization' : 'Data isolation breach detected',
          details: `Checked ${requests.length} maintenance requests`
        });
      }
    } catch (error) {
      addTestResult({
        name: 'Data Isolation Check',
        status: 'fail',
        message: 'Exception checking data isolation',
        details: (error as Error).message
      });
    }

    // Test 7: RLS Policy Check
    try {
      const { data: properties, error } = await supabase
        .from('properties')
        .select('id, organization_id, name')
        .limit(3);

      if (error) {
        addTestResult({
          name: 'RLS Policy Check (Properties)',
          status: 'fail',
          message: 'Error accessing properties',
          details: error.message
        });
      } else {
        const allSameOrg = properties.every(prop => prop.organization_id === currentUser.organization_id);
        addTestResult({
          name: 'RLS Policy Check (Properties)',
          status: allSameOrg ? 'pass' : 'fail',
          message: allSameOrg ? 'RLS properly filtering properties' : 'RLS policy breach detected',
          details: `Accessed ${properties.length} properties, all from org: ${currentUser.organization_id}`
        });
      }
    } catch (error) {
      addTestResult({
        name: 'RLS Policy Check (Properties)',
        status: 'fail',
        message: 'Exception checking RLS policies',
        details: (error as Error).message
      });
    }

    // Test 8: Profile Organization Consistency
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('organization_id, session_organization_id')
        .eq('id', currentUser.id)
        .single();

      if (error) {
        addTestResult({
          name: 'Profile Organization Consistency',
          status: 'fail',
          message: 'Error fetching profile',
          details: error.message
        });
      } else {
        const isConsistent = profile.organization_id === profile.session_organization_id;
        addTestResult({
          name: 'Profile Organization Consistency',
          status: isConsistent ? 'pass' : 'warning',
          message: isConsistent ? 'Profile organization IDs are consistent' : 'Profile organization IDs differ',
          details: `Org: ${profile.organization_id}, Session: ${profile.session_organization_id}`
        });
      }
    } catch (error) {
      addTestResult({
        name: 'Profile Organization Consistency',
        status: 'fail',
        message: 'Exception checking profile consistency',
        details: (error as Error).message
      });
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'pending':
        return <TestTube className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      pass: 'default',
      fail: 'destructive',
      warning: 'secondary',
      pending: 'outline'
    };
    return variants[status] as any;
  };

  const passCount = testResults.filter(r => r.status === 'pass').length;
  const failCount = testResults.filter(r => r.status === 'fail').length;
  const warningCount = testResults.filter(r => r.status === 'warning').length;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-500" />
          <CardTitle>Phase 3 Testing Panel</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Comprehensive testing for mandatory organization membership functionality
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-md">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">User:</span>
            <span className="text-sm">{currentUser?.email || 'Not authenticated'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="text-sm font-medium">Org:</span>
            <span className="text-sm">{currentOrganization?.name || 'None'}</span>
          </div>
        </div>

        {/* Test Controls */}
        <div className="flex gap-2">
          <Button 
            onClick={runPhase3Tests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <TestTube className="h-4 w-4" />
            {isRunning ? 'Running Tests...' : 'Run Phase 3 Tests'}
          </Button>
          
          {testResults.length > 0 && (
            <div className="flex gap-2 ml-4">
              <Badge variant="default">{passCount} Passed</Badge>
              <Badge variant="destructive">{failCount} Failed</Badge>
              <Badge variant="secondary">{warningCount} Warnings</Badge>
            </div>
          )}
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium">Test Results</h3>
            {testResults.map((result, index) => (
              <Alert key={index} className="p-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{result.name}</span>
                      <Badge variant={getStatusBadge(result.status)}>
                        {result.status.toUpperCase()}
                      </Badge>
                    </div>
                    <AlertDescription>{result.message}</AlertDescription>
                    {result.details && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {result.details}
                      </p>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* Overall Status */}
        {testResults.length > 0 && (
          <Alert className={`p-4 ${failCount > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
            <div className="flex items-center gap-2">
              {failCount > 0 ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              <span className="font-medium">
                {failCount > 0 
                  ? `Phase 3 has ${failCount} critical issue(s) that need attention`
                  : 'Phase 3 implementation is working correctly!'
                }
              </span>
            </div>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};