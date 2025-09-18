import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, User, Key, Database, Mail, RefreshCw } from 'lucide-react';
import { useSimpleAuth } from '@/contexts/SimpleAuthContext';
import { signInWithEmailPassword, signOutUser } from '@/hooks/auth/authOperations';
import { userService } from '@/services/userService';
import { supabase } from '@/lib/supabase';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  details?: any;
}

export const AuthTestingPanel: React.FC = () => {
  const { currentUser, session, loading, isAdmin } = useSimpleAuth();
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testAuthFlow = async () => {
    clearResults();
    setIsRunningTests(true);

    try {
      // Test 1: Check current auth state
      addTestResult({
        name: 'Current Auth State',
        status: currentUser ? 'success' : 'error',
        message: currentUser 
          ? `Authenticated as ${currentUser.email} (${currentUser.role})`
          : 'Not authenticated',
        details: { user: currentUser, session: !!session, loading }
      });

      // Test 2: Check database connection
      try {
        const { data, error } = await supabase.from('profiles').select('count').limit(1);
        addTestResult({
          name: 'Database Connection',
          status: error ? 'error' : 'success',
          message: error ? `DB Error: ${error.message}` : 'Database accessible',
          details: { data, error }
        });
      } catch (dbError: any) {
        addTestResult({
          name: 'Database Connection',
          status: 'error',
          message: `DB Exception: ${dbError.message}`,
          details: dbError
        });
      }

      // Test 3: Check organization setup
      if (currentUser) {
        try {
          const { data: orgData, error: orgError } = await supabase
            .from('user_organizations')
            .select('*, organizations(*)')
            .eq('user_id', currentUser.id)
            .eq('is_active', true);

          addTestResult({
            name: 'Organization Setup',
            status: orgError || !orgData?.length ? 'error' : 'success',
            message: orgError 
              ? `Org Error: ${orgError.message}` 
              : `Member of ${orgData.length} organization(s)`,
            details: { orgData, orgError }
          });
        } catch (orgException: any) {
          addTestResult({
            name: 'Organization Setup',
            status: 'error',
            message: `Org Exception: ${orgException.message}`,
            details: orgException
          });
        }
      }

      // Test 4: Check user service functionality
      try {
        const users = await userService.getAllUsers();
        addTestResult({
          name: 'User Service',
          status: 'success',
          message: `User service working - found ${users.length} users`,
          details: { userCount: users.length }
        });
      } catch (userServiceError: any) {
        addTestResult({
          name: 'User Service',
          status: 'error',
          message: `User Service Error: ${userServiceError.message}`,
          details: userServiceError
        });
      }

      // Test 5: Check RLS policies
      if (currentUser) {
        try {
          const { data: testData, error: rlsError } = await supabase
            .from('maintenance_requests')
            .select('count')
            .limit(1);

          addTestResult({
            name: 'RLS Policies',
            status: rlsError ? 'error' : 'success',
            message: rlsError 
              ? `RLS Error: ${rlsError.message}` 
              : 'RLS policies working correctly',
            details: { testData, rlsError }
          });
        } catch (rlsException: any) {
          addTestResult({
            name: 'RLS Policies',
            status: 'error',
            message: `RLS Exception: ${rlsException.message}`,
            details: rlsException
          });
        }
      }

      // Test 6: First user admin assignment check
      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('email, role, created_at')
          .order('created_at', { ascending: true })
          .limit(5);

        if (profilesError) {
          addTestResult({
            name: 'Admin Assignment Check',
            status: 'error',
            message: `Profiles Error: ${profilesError.message}`,
            details: profilesError
          });
        } else if (profilesData && profilesData.length > 0) {
          const firstUser = profilesData[0];
          addTestResult({
            name: 'Admin Assignment Check',
            status: firstUser.role === 'admin' ? 'success' : 'error',
            message: firstUser.role === 'admin' 
              ? `First user (${firstUser.email}) correctly assigned admin role`
              : `First user (${firstUser.email}) has role '${firstUser.role}' instead of 'admin'`,
            details: { firstUser, allUsers: profilesData }
          });
        } else {
          addTestResult({
            name: 'Admin Assignment Check',
            status: 'error',
            message: 'No users found in profiles table',
            details: profilesData
          });
        }
      } catch (adminCheckError: any) {
        addTestResult({
          name: 'Admin Assignment Check',
          status: 'error',
          message: `Admin Check Exception: ${adminCheckError.message}`,
          details: adminCheckError
        });
      }

    } finally {
      setIsRunningTests(false);
    }
  };

  const testSignOut = async () => {
    try {
      await signOutUser();
    } catch (error: any) {
      console.error('Test sign out error:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          Phase 1-3 Authentication Testing Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Alert className={currentUser ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
            <User className="w-4 h-4" />
            <AlertDescription>
              <strong>Auth Status:</strong> {currentUser ? 'Authenticated' : 'Not Authenticated'}
              {currentUser && (
                <div className="mt-1 text-xs">
                  <div>Email: {currentUser.email}</div>
                  <div>Role: <Badge variant="outline">{currentUser.role}</Badge></div>
                  <div>Organization: {currentUser.organization_id || 'None'}</div>
                </div>
              )}
            </AlertDescription>
          </Alert>

          <Alert className={session ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
            <Database className="w-4 h-4" />
            <AlertDescription>
              <strong>Session:</strong> {session ? 'Active' : 'None'}
              {session && (
                <div className="mt-1 text-xs">
                  <div>Expires: {new Date(session.expires_at! * 1000).toLocaleString()}</div>
                </div>
              )}
            </AlertDescription>
          </Alert>
        </div>

        {/* Test Controls */}
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={testAuthFlow} 
            disabled={isRunningTests}
            className="flex items-center gap-2"
          >
            {isRunningTests ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Run Comprehensive Tests
          </Button>
          
          <Button 
            onClick={clearResults} 
            variant="outline"
            disabled={isRunningTests}
          >
            Clear Results
          </Button>

          {currentUser && (
            <Button 
              onClick={testSignOut} 
              variant="destructive"
              disabled={isRunningTests}
            >
              Test Sign Out
            </Button>
          )}
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Test Results</h3>
            {testResults.map((result, index) => (
              <Alert key={index} className={getStatusColor(result.status)}>
                <div className="flex items-start gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="font-medium">{result.name}</div>
                    <div className="text-sm mt-1">{result.message}</div>
                    {result.details && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer text-gray-600">
                          View Details
                        </summary>
                        <pre className="text-xs mt-1 p-2 bg-white rounded border overflow-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {/* Summary */}
        {testResults.length > 0 && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              <strong>Summary:</strong> {testResults.filter(r => r.status === 'success').length} passed, {' '}
              {testResults.filter(r => r.status === 'error').length} failed out of {testResults.length} tests
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};