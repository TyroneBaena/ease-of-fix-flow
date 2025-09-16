import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building2, 
  Users, 
  Shield, 
  Database,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  ArrowLeftRight
} from 'lucide-react';
import { useUserContext, useMultiOrganizationContext } from '@/contexts/UnifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/lib/toast';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'pending' | 'warning';
  message: string;
  details?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export const MultiOrgTestingPanel: React.FC = () => {
  const { currentUser } = useUserContext();
  const multiOrgContext = useMultiOrganizationContext();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const runMultiOrgTests = async () => {
    setTesting(true);
    const results: TestResult[] = [];

    try {
      // Test 1: User Organizations Access
      try {
        const userOrganizations = multiOrgContext?.userOrganizations || [];
        results.push({
          name: 'User Organizations Access',
          status: userOrganizations.length > 0 ? 'pass' : 'warning',
          message: userOrganizations.length > 0 
            ? `User has access to ${userOrganizations.length} organization(s)`
            : 'User has no organization access',
          details: userOrganizations.map(uo => uo.organization.name).join(', '),
          severity: userOrganizations.length === 0 ? 'high' : 'low'
        });
      } catch (error) {
        results.push({
          name: 'User Organizations Access',
          status: 'fail',
          message: 'Failed to check user organizations',
          details: error instanceof Error ? error.message : 'Unknown error',
          severity: 'critical'
        });
      }

      // Test 2: Multi-Organization Data Isolation
      if (multiOrgContext?.userOrganizations && multiOrgContext.userOrganizations.length > 1) {
        try {
          const currentOrgId = multiOrgContext.currentOrganization?.id;
          
          // Test data isolation by checking maintenance requests
          const { data: currentOrgRequests, error: requestsError } = await supabase
            .from('maintenance_requests')
            .select('id, organization_id, title')
            .limit(5);

          if (requestsError) throw requestsError;

          const crossOrgData = currentOrgRequests?.filter(req => req.organization_id !== currentOrgId) || [];
          
          results.push({
            name: 'Multi-Organization Data Isolation',
            status: crossOrgData.length === 0 ? 'pass' : 'fail',
            message: crossOrgData.length === 0 
              ? 'Data properly isolated by organization'
              : `Found ${crossOrgData.length} cross-organization data leaks`,
            details: `Current org: ${currentOrgId}, Found requests: ${currentOrgRequests?.length || 0}`,
            severity: crossOrgData.length > 0 ? 'critical' : 'low'
          });
        } catch (error) {
          results.push({
            name: 'Multi-Organization Data Isolation',
            status: 'fail',
            message: 'Failed to test data isolation',
            details: error instanceof Error ? error.message : 'Unknown error',
            severity: 'high'
          });
        }
      } else {
        results.push({
          name: 'Multi-Organization Data Isolation',
          status: 'warning',
          message: 'Cannot test - user not in multiple organizations',
          details: 'User needs access to multiple organizations to test isolation',
          severity: 'medium'
        });
      }

      // Test 3: Organization Switching Functionality
      if (multiOrgContext?.userOrganizations && multiOrgContext.userOrganizations.length > 1) {
        try {
          const originalOrg = multiOrgContext.currentOrganization;
          const targetOrg = multiOrgContext.userOrganizations.find(
            uo => uo.organization_id !== originalOrg?.id
          );

          if (targetOrg) {
            // Test switching to another organization
            await multiOrgContext.switchOrganization(targetOrg.organization_id);
            
            // Wait a moment for the switch to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Check if switch was successful
            const switchSuccessful = multiOrgContext.currentOrganization?.id === targetOrg.organization_id;
            
            results.push({
              name: 'Organization Switching',
              status: switchSuccessful ? 'pass' : 'fail',
              message: switchSuccessful 
                ? `Successfully switched to ${targetOrg.organization.name}`
                : 'Organization switch failed',
              details: `From: ${originalOrg?.name} -> To: ${targetOrg.organization.name}`,
              severity: switchSuccessful ? 'low' : 'high'
            });

            // Switch back to original organization
            if (originalOrg) {
              await multiOrgContext.switchOrganization(originalOrg.id);
            }
          } else {
            results.push({
              name: 'Organization Switching',
              status: 'warning',
              message: 'No alternative organization found for switching test',
              severity: 'medium'
            });
          }
        } catch (error) {
          results.push({
            name: 'Organization Switching',
            status: 'fail',
            message: 'Organization switching failed',
            details: error instanceof Error ? error.message : 'Unknown error',
            severity: 'high'
          });
        }
      } else {
        results.push({
          name: 'Organization Switching',
          status: 'warning',
          message: 'Cannot test - user not in multiple organizations',
          severity: 'medium'
        });
      }

      // Test 4: User Role Consistency Across Organizations
      try {
        const userOrganizations = multiOrgContext?.userOrganizations || [];
        const roles = userOrganizations.map(uo => uo.role);
        const uniqueRoles = [...new Set(roles)];

        results.push({
          name: 'User Role Consistency',
          status: 'pass',
          message: `User has ${uniqueRoles.length} unique role(s) across organizations`,
          details: `Roles: ${uniqueRoles.join(', ')}`,
          severity: 'low'
        });
      } catch (error) {
        results.push({
          name: 'User Role Consistency',
          status: 'fail',
          message: 'Failed to check role consistency',
          details: error instanceof Error ? error.message : 'Unknown error',
          severity: 'medium'
        });
      }

      // Test 5: Cross-Organization Contractor Access
      try {
        const { data: contractors, error: contractorsError } = await supabase
          .from('contractors')
          .select('id, organization_id, company_name')
          .limit(10);

        if (contractorsError) throw contractorsError;

        const currentOrgId = multiOrgContext?.currentOrganization?.id;
        const crossOrgContractors = contractors?.filter(c => c.organization_id !== currentOrgId) || [];

        results.push({
          name: 'Cross-Organization Contractor Access',
          status: crossOrgContractors.length === 0 ? 'pass' : 'fail',
          message: crossOrgContractors.length === 0 
            ? 'Contractors properly isolated by organization'
            : `Found ${crossOrgContractors.length} cross-organization contractors`,
          details: `Current org: ${currentOrgId}, Total contractors visible: ${contractors?.length || 0}`,
          severity: crossOrgContractors.length > 0 ? 'critical' : 'low'
        });
      } catch (error) {
        results.push({
          name: 'Cross-Organization Contractor Access',
          status: 'fail',
          message: 'Failed to test contractor access',
          details: error instanceof Error ? error.message : 'Unknown error',
          severity: 'high'
        });
      }

      // Test 6: Properties Access Across Organizations
      try {
        const { data: properties, error: propertiesError } = await supabase
          .from('properties')
          .select('id, organization_id, name')
          .limit(10);

        if (propertiesError) throw propertiesError;

        const currentOrgId = multiOrgContext?.currentOrganization?.id;
        const crossOrgProperties = properties?.filter(p => p.organization_id !== currentOrgId) || [];

        results.push({
          name: 'Cross-Organization Properties Access',
          status: crossOrgProperties.length === 0 ? 'pass' : 'fail',
          message: crossOrgProperties.length === 0 
            ? 'Properties properly isolated by organization'
            : `Found ${crossOrgProperties.length} cross-organization properties`,
          details: `Current org: ${currentOrgId}, Total properties visible: ${properties?.length || 0}`,
          severity: crossOrgProperties.length > 0 ? 'critical' : 'low'
        });
      } catch (error) {
        results.push({
          name: 'Cross-Organization Properties Access',
          status: 'fail',
          message: 'Failed to test properties access',
          details: error instanceof Error ? error.message : 'Unknown error',
          severity: 'high'
        });
      }

      // Test 7: Organization Membership Verification
      try {
        if (currentUser?.id) {
          const { data: memberships, error: membershipError } = await supabase
            .from('user_organizations')
            .select('organization_id, role, is_active, is_default')
            .eq('user_id', currentUser.id)
            .eq('is_active', true);

          if (membershipError) throw membershipError;

          const contextOrgs = multiOrgContext?.userOrganizations?.length || 0;
          const dbMemberships = memberships?.length || 0;

          results.push({
            name: 'Organization Membership Verification',
            status: contextOrgs === dbMemberships ? 'pass' : 'warning',
            message: contextOrgs === dbMemberships 
              ? 'Context and database memberships match'
              : `Mismatch: Context shows ${contextOrgs}, DB shows ${dbMemberships}`,
            details: `Active memberships: ${dbMemberships}, Default: ${memberships?.find(m => m.is_default)?.organization_id || 'None'}`,
            severity: contextOrgs !== dbMemberships ? 'medium' : 'low'
          });
        }
      } catch (error) {
        results.push({
          name: 'Organization Membership Verification',
          status: 'fail',
          message: 'Failed to verify organization memberships',
          details: error instanceof Error ? error.message : 'Unknown error',
          severity: 'high'
        });
      }

      // Test 8: Session Organization Persistence
      try {
        const currentOrgId = multiOrgContext?.currentOrganization?.id;
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('session_organization_id, organization_id')
          .eq('id', currentUser?.id)
          .single();

        if (profileError) throw profileError;

        const sessionMatches = profile.session_organization_id === currentOrgId;

        results.push({
          name: 'Session Organization Persistence',
          status: sessionMatches ? 'pass' : 'warning',
          message: sessionMatches 
            ? 'Session organization matches current context'
            : 'Session organization mismatch detected',
          details: `Context: ${currentOrgId}, Session: ${profile.session_organization_id}, Profile: ${profile.organization_id}`,
          severity: sessionMatches ? 'low' : 'medium'
        });
      } catch (error) {
        results.push({
          name: 'Session Organization Persistence',
          status: 'fail',
          message: 'Failed to check session organization',
          details: error instanceof Error ? error.message : 'Unknown error',
          severity: 'medium'
        });
      }

    } catch (error) {
      results.push({
        name: 'Multi-Organization Testing',
        status: 'fail',
        message: 'Critical error during testing',
        details: error instanceof Error ? error.message : 'Unknown error',
        severity: 'critical'
      });
    }

    setTestResults(results);
    setTesting(false);

    // Show summary notification
    const criticalFailures = results.filter(r => r.status === 'fail' && r.severity === 'critical').length;
    const failures = results.filter(r => r.status === 'fail').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    
    if (criticalFailures > 0) {
      toast.error(`${criticalFailures} critical security issues found!`);
    } else if (failures > 0) {
      toast.error(`${failures} tests failed`);
    } else if (warnings > 0) {
      toast.warning(`${warnings} warnings detected`);
    } else {
      toast.success('All multi-organization tests passed!');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string, severity?: string) => {
    switch (status) {
      case 'pass': return <Badge variant="default" className="bg-green-100 text-green-800">Pass</Badge>;
      case 'fail': 
        return severity === 'critical' 
          ? <Badge variant="destructive" className="bg-red-600">CRITICAL</Badge>
          : <Badge variant="destructive">Fail</Badge>;
      case 'warning': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
  };

  const criticalIssues = testResults.filter(r => r.status === 'fail' && r.severity === 'critical');
  const highIssues = testResults.filter(r => r.status === 'fail' && r.severity === 'high');

  return (
    <Card className="w-full max-w-5xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="h-5 w-5" />
          <span>Multi-Organization Testing Panel</span>
        </CardTitle>
        <CardDescription>
          Comprehensive testing for multi-organization scenarios and data isolation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Critical Issues Alert */}
        {criticalIssues.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{criticalIssues.length} critical security issue(s) detected!</strong> 
              These must be fixed immediately as they could allow unauthorized cross-organization data access.
            </AlertDescription>
          </Alert>
        )}

        {/* High Issues Alert */}
        {highIssues.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {highIssues.length} high-priority issue(s) found that should be addressed soon.
            </AlertDescription>
          </Alert>
        )}

        {/* Test Controls */}
        <div className="flex justify-between items-center">
          <Button 
            onClick={runMultiOrgTests} 
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
                <ArrowLeftRight className="h-4 w-4" />
                <span>Run Multi-Org Tests</span>
              </>
            )}
          </Button>
          
          {testResults.length > 0 && (
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-green-600">
                ✓ {testResults.filter(r => r.status === 'pass').length} passed
              </span>
              <span className="text-red-600">
                ✗ {testResults.filter(r => r.status === 'fail').length} failed
              </span>
              <span className="text-yellow-600">
                ⚠ {testResults.filter(r => r.status === 'warning').length} warnings
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Current State Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">User</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {currentUser?.email || 'Not loaded'}
              </p>
              <p className="text-xs text-muted-foreground">
                Role: {currentUser?.role || 'Unknown'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Current Org</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {multiOrgContext?.currentOrganization?.name || 'Not loaded'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Total Orgs</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {multiOrgContext?.userOrganizations?.length || 0} organizations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium">Security</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {criticalIssues.length} critical issues
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Organization List */}
        {multiOrgContext?.userOrganizations && multiOrgContext.userOrganizations.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-3">User Organizations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {multiOrgContext.userOrganizations.map((userOrg) => (
                <Card key={userOrg.id} className={`${
                  userOrg.organization_id === multiOrgContext.currentOrganization?.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : ''
                }`}>
                  <CardContent className="pt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{userOrg.organization.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Role: {userOrg.role} 
                          {userOrg.is_default && ' (Default)'}
                          {userOrg.organization_id === multiOrgContext.currentOrganization?.id && ' (Current)'}
                        </p>
                      </div>
                      {userOrg.organization_id !== multiOrgContext.currentOrganization?.id && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => multiOrgContext.switchOrganization(userOrg.organization_id)}
                          disabled={multiOrgContext.loading}
                        >
                          Switch
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Test Results</h3>
            {testResults.map((result, index) => (
              <div 
                key={index} 
                className={`flex items-start space-x-3 p-4 border rounded-lg ${
                  result.severity === 'critical' ? 'border-red-500 bg-red-50' :
                  result.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                  result.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                  'border-gray-200'
                }`}
              >
                {getStatusIcon(result.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{result.name}</p>
                    {getStatusBadge(result.status, result.severity)}
                  </div>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                  {result.details && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{result.details}</p>
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