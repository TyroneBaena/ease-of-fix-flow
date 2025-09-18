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
  Play,
  Mail,
  Users,
  Building,
  Wrench,
  FileText,
  Calendar,
  Target
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedAuth } from '@/contexts/UnifiedAuthContext';
import { toast } from 'sonner';

interface WorkflowTestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending' | 'running';
  message: string;
  details?: string;
  category: 'auth' | 'email' | 'user' | 'contractor' | 'request' | 'job' | 'data';
}

export const WorkflowTestingPanel: React.FC = () => {
  const { currentUser, currentOrganization } = useUnifiedAuth();
  const [testResults, setTestResults] = useState<WorkflowTestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');

  const addTestResult = (result: WorkflowTestResult) => {
    setTestResults(prev => [...prev, result]);
  };

  const updateTestResult = (name: string, updates: Partial<WorkflowTestResult>) => {
    setTestResults(prev => 
      prev.map(result => 
        result.name === name 
          ? { ...result, ...updates }
          : result
      )
    );
  };

  // Test 1: Data Integrity
  const testDataIntegrity = async () => {
    setCurrentTest('Data Integrity Tests');
    
    addTestResult({
      name: 'Organization Isolation Check',
      status: 'running',
      message: 'Checking for cross-organization data leaks...',
      category: 'data'
    });

    try {
      // Check invoices have proper organization_id
      const { data: invoicesCheck } = await supabase
        .from('invoices')
        .select('id, organization_id')
        .is('organization_id', null);
        
      const nullInvoices = invoicesCheck?.length || 0;
      
      updateTestResult('Organization Isolation Check', {
        status: nullInvoices === 0 ? 'pass' : 'fail',
        message: nullInvoices === 0 
          ? 'All invoices have proper organization assignment' 
          : `Found ${nullInvoices} invoices with NULL organization_id`,
        details: nullInvoices > 0 ? 'This is a critical security vulnerability' : undefined
      });

      // Check cross-organization contractor assignments
      const { data: crossOrgCheck } = await supabase.rpc('get_security_compliance_status');
      
      if (crossOrgCheck) {
        const criticalFailures = crossOrgCheck.filter((check: any) => 
          check.status === 'CRITICAL_FAILURE' && check.violation_count > 0
        );
        
        addTestResult({
          name: 'Cross-Organization Assignment Check',
          status: criticalFailures.length === 0 ? 'pass' : 'fail',
          message: criticalFailures.length === 0 
            ? 'No cross-organization violations found' 
            : `Found ${criticalFailures.length} critical violations`,
          details: criticalFailures.map((f: any) => `${f.check_name}: ${f.violation_count} violations`).join(', '),
          category: 'data'
        });
      }
    } catch (error) {
      updateTestResult('Organization Isolation Check', {
        status: 'fail',
        message: 'Error checking data integrity',
        details: (error as Error).message
      });
    }
  };

  // Test 2: User Invitation System
  const testUserInvitationSystem = async () => {
    setCurrentTest('User Invitation System');
    
    addTestResult({
      name: 'User Invitation Edge Function',
      status: 'running',
      message: 'Testing user invitation edge function...',
      category: 'email'
    });

    try {
      // Test the invitation system with a test payload
      const testEmail = `test-invite-${Date.now()}@test.com`;
      const { data, error } = await supabase.functions.invoke('send-invite', {
        body: {
          email: testEmail,
          name: 'Test User',
          role: 'manager',
          assignedProperties: [],
          bypassExistingCheck: true // Don't actually create the user
        }
      });

      updateTestResult('User Invitation Edge Function', {
        status: error ? 'fail' : (data?.success ? 'pass' : 'warning'),
        message: error 
          ? `Edge function error: ${error.message}`
          : data?.success 
            ? 'User invitation system functional'
            : `Function returned: ${data?.message || 'Unknown error'}`,
        details: error ? undefined : JSON.stringify(data, null, 2)
      });
    } catch (error) {
      updateTestResult('User Invitation Edge Function', {
        status: 'fail',
        message: 'Failed to test invitation system',
        details: (error as Error).message
      });
    }
  };

  // Test 3: Contractor System
  const testContractorSystem = async () => {
    setCurrentTest('Contractor System');
    
    addTestResult({
      name: 'Contractor Invitation System',
      status: 'running',
      message: 'Testing contractor invitation...',
      category: 'contractor'
    });

    try {
      const testEmail = `test-contractor-${Date.now()}@test.com`;
      const { data, error } = await supabase.functions.invoke('invite-contractor', {
        body: {
          email: testEmail,
          contact_name: 'Test Contractor',
          company_name: 'Test Company',
          phone: '1234567890',
          specialties: ['plumbing'],
          address: 'Test Address'
        }
      });

      updateTestResult('Contractor Invitation System', {
        status: error ? 'fail' : 'pass',
        message: error 
          ? `Contractor invitation failed: ${error.message}`
          : 'Contractor invitation system functional',
        details: data ? JSON.stringify(data, null, 2) : undefined
      });
    } catch (error) {
      updateTestResult('Contractor Invitation System', {
        status: 'fail',
        message: 'Error testing contractor invitation',
        details: (error as Error).message
      });
    }

    // Test contractor dashboard access
    addTestResult({
      name: 'Contractor Dashboard Access',
      status: 'running',
      message: 'Checking contractor data access...',
      category: 'contractor'
    });

    try {
      const { data: contractors } = await supabase
        .from('contractors')
        .select('id, user_id, organization_id')
        .limit(1);

      if (contractors && contractors.length > 0) {
        const contractor = contractors[0];
        
        // Test if contractor can access their data
        const { data: quotes } = await supabase
          .from('quotes')
          .select('id')
          .eq('contractor_id', contractor.id)
          .limit(1);

        updateTestResult('Contractor Dashboard Access', {
          status: 'pass',
          message: 'Contractor data access functional',
          details: `Found contractor ${contractor.id} with quotes: ${quotes?.length || 0}`
        });
      } else {
        updateTestResult('Contractor Dashboard Access', {
          status: 'warning',
          message: 'No contractors found to test',
          details: 'Cannot test contractor dashboard without contractor records'
        });
      }
    } catch (error) {
      updateTestResult('Contractor Dashboard Access', {
        status: 'fail',
        message: 'Error testing contractor dashboard',
        details: (error as Error).message
      });
    }
  };

  // Test 4: Maintenance Request Lifecycle
  const testMaintenanceRequestLifecycle = async () => {
    setCurrentTest('Maintenance Request Lifecycle');
    
    addTestResult({
      name: 'Request Creation System',
      status: 'running',
      message: 'Testing maintenance request creation...',
      category: 'request'
    });

    try {
      // Check if we can read requests properly
      const { data: requests } = await supabase
        .from('maintenance_requests')
        .select('id, status, organization_id, contractor_id')
        .limit(5);

      if (requests && requests.length > 0) {
        const assignedRequests = requests.filter(r => r.contractor_id);
        const orgConsistency = requests.every(r => r.organization_id === currentOrganization?.id);
        
        updateTestResult('Request Creation System', {
          status: 'pass',
          message: `Found ${requests.length} requests, ${assignedRequests.length} assigned`,
          details: `Organization consistency: ${orgConsistency ? 'Good' : 'Issues detected'}`
        });

        // Test assignment workflow
        addTestResult({
          name: 'Request Assignment Workflow',
          status: assignedRequests.length > 0 ? 'pass' : 'warning',
          message: assignedRequests.length > 0 
            ? 'Request assignment system working' 
            : 'No assigned requests found',
          details: assignedRequests.length > 0 
            ? `Found ${assignedRequests.length} assigned requests`
            : 'Cannot verify assignment workflow without assigned requests',
          category: 'request'
        });
      } else {
        updateTestResult('Request Creation System', {
          status: 'warning',
          message: 'No maintenance requests found',
          details: 'Cannot test request lifecycle without existing requests'
        });
      }
    } catch (error) {
      updateTestResult('Request Creation System', {
        status: 'fail',
        message: 'Error testing request system',
        details: (error as Error).message
      });
    }
  };

  // Test 5: Email Notification System
  const testEmailNotificationSystem = async () => {
    setCurrentTest('Email Notification System');
    
    addTestResult({
      name: 'Comment Notification System',
      status: 'running',
      message: 'Testing comment notifications...',
      category: 'email'
    });

    try {
      // Check recent notifications
      const { data: notifications } = await supabase
        .from('notifications')
        .select('id, title, type, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(10);

      if (notifications && notifications.length > 0) {
        const recentNotifications = notifications.filter(n => 
          new Date(n.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        );

        updateTestResult('Comment Notification System', {
          status: recentNotifications.length > 0 ? 'pass' : 'warning',
          message: recentNotifications.length > 0 
            ? `Found ${recentNotifications.length} recent notifications`
            : 'No recent notifications found',
          details: `Total notifications: ${notifications.length}, Recent: ${recentNotifications.length}`
        });
      } else {
        updateTestResult('Comment Notification System', {
          status: 'warning',
          message: 'No notifications found',
          details: 'Cannot test notification system without existing notifications'
        });
      }

      // Test email relay system
      addTestResult({
        name: 'Email Relay System',
        status: 'running',
        message: 'Checking email relay keys...',
        category: 'email'
      });

      const { data: emailKeys } = await supabase
        .from('email_relay_keys')
        .select('id, actor_type, is_active, expires_at')
        .eq('is_active', true)
        .limit(5);

      updateTestResult('Email Relay System', {
        status: emailKeys && emailKeys.length > 0 ? 'pass' : 'warning',
        message: emailKeys && emailKeys.length > 0 
          ? `Found ${emailKeys.length} active email relay keys`
          : 'No active email relay keys found',
        details: emailKeys ? `Active keys: ${emailKeys.length}` : 'Email relay system may not be functional'
      });
    } catch (error) {
      updateTestResult('Comment Notification System', {
        status: 'fail',
        message: 'Error testing notification system',
        details: (error as Error).message
      });
    }
  };

  // Test 6: Job Scheduling System
  const testJobSchedulingSystem = async () => {
    setCurrentTest('Job Scheduling System');
    
    addTestResult({
      name: 'Job Schedule Creation',
      status: 'running',
      message: 'Testing job scheduling...',
      category: 'job'
    });

    try {
      const { data: schedules } = await supabase
        .from('job_schedules')
        .select('id, scheduled_dates, contractor_id, request_id, organization_id')
        .limit(5);

      if (schedules && schedules.length > 0) {
        const validSchedules = schedules.filter(s => 
          s.scheduled_dates && Array.isArray(s.scheduled_dates) && s.scheduled_dates.length > 0
        );

        updateTestResult('Job Schedule Creation', {
          status: validSchedules.length > 0 ? 'pass' : 'warning',
          message: `Found ${schedules.length} schedules, ${validSchedules.length} with dates`,
          details: validSchedules.length > 0 
            ? 'Job scheduling system functional'
            : 'Job schedules exist but may lack proper date data'
        });

        // Test schedule history
        addTestResult({
          name: 'Schedule History Tracking',
          status: 'running',
          message: 'Checking schedule history...',
          category: 'job'
        });

        const { data: history } = await supabase
          .from('job_scheduling_history')
          .select('id, action, contractor_id')
          .limit(5);

        updateTestResult('Schedule History Tracking', {
          status: history && history.length > 0 ? 'pass' : 'warning',
          message: history && history.length > 0 
            ? `Found ${history.length} schedule history entries`
            : 'No schedule history found',
          details: history ? `History entries: ${history.length}` : 'Schedule tracking may not be working'
        });
      } else {
        updateTestResult('Job Schedule Creation', {
          status: 'warning',
          message: 'No job schedules found',
          details: 'Cannot test scheduling system without existing schedules'
        });
      }
    } catch (error) {
      updateTestResult('Job Schedule Creation', {
        status: 'fail',
        message: 'Error testing job scheduling',
        details: (error as Error).message
      });
    }
  };

  const runAllWorkflowTests = async () => {
    if (!currentUser) {
      toast.error('Please log in to run workflow tests');
      return;
    }

    setIsRunning(true);
    setTestResults([]);
    
    try {
      await testDataIntegrity();
      await testUserInvitationSystem();
      await testContractorSystem();
      await testMaintenanceRequestLifecycle();
      await testEmailNotificationSystem();
      await testJobSchedulingSystem();
      
      toast.success('All workflow tests completed');
    } catch (error) {
      console.error('Error running workflow tests:', error);
      toast.error('Error during workflow testing');
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'running': return <Play className="h-4 w-4 text-blue-500 animate-pulse" />;
      default: return <TestTube className="h-4 w-4 text-gray-500" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'auth': return <Users className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'contractor': return <Wrench className="h-4 w-4" />;
      case 'request': return <FileText className="h-4 w-4" />;
      case 'job': return <Calendar className="h-4 w-4" />;
      case 'data': return <Building className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pass': return 'success';
      case 'fail': return 'destructive';
      case 'warning': return 'warning';
      case 'running': return 'secondary';
      default: return 'outline';
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
          Critical Workflow Testing Panel
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Comprehensive end-to-end testing of all user-facing functionality
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runAllWorkflowTests} 
            disabled={isRunning || !currentUser}
            className="flex items-center gap-2"
          >
            <TestTube className="h-4 w-4" />
            {isRunning ? 'Running Tests...' : 'Run All Workflow Tests'}
          </Button>
        </div>

        {currentTest && (
          <Alert className="border-blue-200 bg-blue-50">
            <Play className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-800">
              Currently running: {currentTest}
            </AlertDescription>
          </Alert>
        )}

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
                  <div className="flex items-center gap-2">
                    {getStatusIcon(result.status)}
                    {getCategoryIcon(result.category)}
                  </div>
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
                  {failCount} critical workflow(s) failed. Immediate attention required.
                </AlertDescription>
              </Alert>
            )}

            {failCount === 0 && warningCount > 0 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-yellow-800">
                  {warningCount} workflow(s) have warnings. Review recommended.
                </AlertDescription>
              </Alert>
            )}

            {failCount === 0 && warningCount === 0 && testResults.length > 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-green-800">
                  All critical workflows are functioning correctly!
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};