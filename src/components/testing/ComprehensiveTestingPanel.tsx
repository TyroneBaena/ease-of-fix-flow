import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Users, 
  Building2,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { toast } from 'sonner';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  details?: string;
}

export const ComprehensiveTestingPanel: React.FC = () => {
  const { currentUser, currentOrganization, userOrganizations } = useUnifiedAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const runComprehensiveTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    // Test 1: Authentication Status
    addTestResult({
      name: 'Authentication Status',
      status: currentUser ? 'pass' : 'fail',
      message: currentUser ? `Authenticated as: ${currentUser.email}` : 'Not authenticated',
      details: currentUser ? `User ID: ${currentUser.id}, Role: ${currentUser.role}` : 'Please sign in'
    });

    if (!currentUser) {
      setIsRunning(false);
      return;
    }

    // Test 2: User Profile Completeness
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error) throw error;

      const hasCompleteProfile = profile && profile.organization_id && profile.role;
      addTestResult({
        name: 'User Profile Completeness',
        status: hasCompleteProfile ? 'pass' : 'warning',
        message: hasCompleteProfile ? 'Profile is complete' : 'Profile may be incomplete',
        details: `Name: ${profile?.name || 'Missing'}, Role: ${profile?.role || 'Missing'}, Org: ${profile?.organization_id || 'Missing'}`
      });
    } catch (error) {
      addTestResult({
        name: 'User Profile Completeness',
        status: 'fail',
        message: 'Error fetching profile',
        details: (error as Error).message
      });
    }

    // Test 3: Organization Assignment
    addTestResult({
      name: 'Organization Assignment',
      status: currentUser.organization_id ? 'pass' : 'fail',
      message: currentUser.organization_id ? 'User has organization assigned' : 'No organization assigned',
      details: currentUser.organization_id ? `Organization ID: ${currentUser.organization_id}` : 'User should go through organization setup'
    });

    // Test 4: Current Organization Context
    addTestResult({
      name: 'Current Organization Context',
      status: currentOrganization ? 'pass' : 'fail',
      message: currentOrganization ? `Current org: ${currentOrganization.name}` : 'No current organization loaded',
      details: currentOrganization ? `ID: ${currentOrganization.id}, Slug: ${currentOrganization.slug}` : 'Organization context not loaded'
    });

    // Test 5: User Organizations List
    addTestResult({
      name: 'User Organizations List',
      status: userOrganizations.length > 0 ? 'pass' : 'warning',
      message: `Found ${userOrganizations.length} organization membership(s)`,
      details: userOrganizations.map(uo => `${uo.organization.name} (${uo.role})`).join(', ')
    });

    // Test 6: Organization Membership Consistency
    if (currentUser.organization_id) {
      try {
        const { data: userOrgMembership, error } = await supabase
          .from('user_organizations')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('organization_id', currentUser.organization_id)
          .eq('is_active', true)
          .maybeSingle();

        if (error) throw error;

        addTestResult({
          name: 'Organization Membership Consistency',
          status: userOrgMembership ? 'pass' : 'fail',
          message: userOrgMembership ? 'Membership record exists' : 'Missing membership record',
          details: userOrgMembership ? `Role: ${userOrgMembership.role}, Active: ${userOrgMembership.is_active}` : 'user_organizations table missing record'
        });
      } catch (error) {
        addTestResult({
          name: 'Organization Membership Consistency',
          status: 'fail',
          message: 'Error checking membership consistency',
          details: (error as Error).message
        });
      }
    }

    // Test 7: Database RLS Policies
    try {
      // Test if we can read organizations table
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name')
        .limit(1);

      addTestResult({
        name: 'Organization Data Access',
        status: orgsError ? 'fail' : 'pass',
        message: orgsError ? 'Cannot access organizations' : 'Can access organizations data',
        details: orgsError ? orgsError.message : `Found ${orgsData?.length || 0} organizations`
      });
    } catch (error) {
      addTestResult({
        name: 'Organization Data Access',
        status: 'fail',
        message: 'Error testing data access',
        details: (error as Error).message
      });
    }

    // Test 8: Session Validity
    try {
      const { data: session, error } = await supabase.auth.getSession();
      if (error) throw error;

      const isValidSession = session.session && session.session.expires_at && 
        new Date(session.session.expires_at * 1000) > new Date();

      addTestResult({
        name: 'Session Validity',
        status: isValidSession ? 'pass' : 'warning',
        message: isValidSession ? 'Session is valid' : 'Session may be expired',
        details: session.session ? `Expires: ${new Date(session.session.expires_at * 1000).toLocaleString()}` : 'No session'
      });
    } catch (error) {
      addTestResult({
        name: 'Session Validity',
        status: 'fail',
        message: 'Error checking session',
        details: (error as Error).message
      });
    }

    // Test 9: Email Confirmation
    try {
      const { data: session } = await supabase.auth.getSession();
      const isConfirmed = session.session?.user?.email_confirmed_at;

      addTestResult({
        name: 'Email Confirmation',
        status: isConfirmed ? 'pass' : 'warning',
        message: isConfirmed ? 'Email is confirmed' : 'Email not confirmed',
        details: isConfirmed ? `Confirmed at: ${isConfirmed}` : 'User may need to confirm email'
      });
    } catch (error) {
      addTestResult({
        name: 'Email Confirmation',
        status: 'fail',
        message: 'Error checking email confirmation',
        details: (error as Error).message
      });
    }

    setIsRunning(false);
  };

  const fixUserOrganization = async () => {
    if (!currentUser) {
      toast.error('No user logged in');
      return;
    }

    try {
      toast.info('Attempting to fix user organization setup...');
      
      // First, check if user has an organization in profile but missing user_organizations record
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', currentUser.id)
        .single();

      if (profile?.organization_id) {
        // Check if user_organizations record exists
        const { data: userOrg } = await supabase
          .from('user_organizations')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('organization_id', profile.organization_id)
          .maybeSingle();

        if (!userOrg) {
          // Create missing user_organizations record
          const { error } = await supabase
            .from('user_organizations')
            .insert({
              user_id: currentUser.id,
              organization_id: profile.organization_id,
              role: currentUser.role,
              is_active: true,
              is_default: true
            });

          if (error) throw error;
          toast.success('Created missing organization membership record');
        } else {
          toast.info('Organization membership already exists');
        }
      } else {
        toast.warning('User has no organization assigned - needs to go through onboarding');
      }
      
      // Refresh tests after fix
      await runComprehensiveTests();
    } catch (error) {
      console.error('Error fixing user organization:', error);
      toast.error(`Fix failed: ${(error as Error).message}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <TestTube className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pass': return 'success';
      case 'fail': return 'destructive';
      case 'warning': return 'warning';
      default: return 'secondary';
    }
  };

  const passCount = testResults.filter(r => r.status === 'pass').length;
  const failCount = testResults.filter(r => r.status === 'fail').length;
  const warningCount = testResults.filter(r => r.status === 'warning').length;

  return (
    <Card className="w-full max-w-6xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Comprehensive Phase 1-3 Testing Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runComprehensiveTests} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <TestTube className="h-4 w-4" />
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </Button>
          
          <Button 
            onClick={fixUserOrganization} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Fix Organization Issues
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="space-y-4">
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                Passed: {passCount}
              </span>
              <span className="flex items-center gap-1 text-red-600">
                <XCircle className="h-4 w-4" />
                Failed: {failCount}
              </span>
              <span className="flex items-center gap-1 text-yellow-600">
                <AlertTriangle className="h-4 w-4" />
                Warnings: {warningCount}
              </span>
            </div>

            <div className="grid gap-2">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getStatusIcon(result.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{result.name}</span>
                      <Badge variant={getStatusBadge(result.status) as any}>
                        {result.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                    {result.details && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted p-2 rounded">
                        {result.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {failCount > 0 && (
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4" />
                <AlertDescription className="text-red-800">
                  {failCount} test(s) failed. The authentication flow may not work correctly.
                </AlertDescription>
              </Alert>
            )}

            {warningCount > 0 && failCount === 0 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-yellow-800">
                  {warningCount} warning(s) detected. Everything should work but there may be minor issues.
                </AlertDescription>
              </Alert>
            )}

            {failCount === 0 && warningCount === 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-green-800">
                  All tests passed! The authentication and organization system is working correctly.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};