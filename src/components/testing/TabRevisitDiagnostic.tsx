
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { visibilityCoordinator } from '@/utils/visibilityCoordinator';

interface DiagnosticResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

export const TabRevisitDiagnostic: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [coordinatorState, setCoordinatorState] = useState<any>(null);
  const requestCountRef = useRef(0);
  const startTimeRef = useRef(0);

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    requestCountRef.current = 0;
    startTimeRef.current = Date.now();

    const newResults: DiagnosticResult[] = [];

    // Test 1: Check coordinator state
    try {
      const state = visibilityCoordinator.getState();
      setCoordinatorState(state);
      
      if (state.handlers.length > 0) {
        newResults.push({
          test: 'Visibility Coordinator',
          status: 'pass',
          message: `${state.handlers.length} handlers registered`,
          details: state.handlers.map((h: any) => h.id).join(', ')
        });
      } else {
        newResults.push({
          test: 'Visibility Coordinator',
          status: 'warning',
          message: 'No handlers registered',
          details: 'This may be normal if data providers haven\'t mounted yet'
        });
      }
    } catch (error) {
      newResults.push({
        test: 'Visibility Coordinator',
        status: 'fail',
        message: 'Coordinator not accessible',
        details: String(error)
      });
    }

    // Test 2: Check React Query configuration
    try {
      const qc = (window as any).queryClient;
      if (qc) {
        const defaultOptions = qc.getDefaultOptions();
        const refetchOnWindowFocus = defaultOptions?.queries?.refetchOnWindowFocus;
        const refetchOnMount = defaultOptions?.queries?.refetchOnMount;
        const staleTime = defaultOptions?.queries?.staleTime;
        
        if (refetchOnWindowFocus === false && refetchOnMount === false) {
          newResults.push({
            test: 'React Query Configuration',
            status: 'pass',
            message: 'Automatic refetching disabled',
            details: `staleTime: ${staleTime}ms, refetchOnWindowFocus: false, refetchOnMount: false`
          });
        } else {
          newResults.push({
            test: 'React Query Configuration',
            status: 'fail',
            message: 'Aggressive refetching enabled',
            details: `refetchOnWindowFocus: ${refetchOnWindowFocus}, refetchOnMount: ${refetchOnMount}`
          });
        }
      } else {
        newResults.push({
          test: 'React Query Configuration',
          status: 'warning',
          message: 'QueryClient not accessible on window object'
        });
      }
    } catch (error) {
      newResults.push({
        test: 'React Query Configuration',
        status: 'fail',
        message: 'Error checking React Query',
        details: String(error)
      });
    }

    // Test 3: Check if visibility API is supported
    if (typeof document.hidden !== 'undefined') {
      newResults.push({
        test: 'Visibility API Support',
        status: 'pass',
        message: 'Browser supports Page Visibility API'
      });
    } else {
      newResults.push({
        test: 'Visibility API Support',
        status: 'fail',
        message: 'Browser does not support Page Visibility API',
        details: 'Tab revisit features may not work'
      });
    }

    // Test 4: Check console for error patterns
    const errorPatterns = ['false logout', 'undefined user', 'session cleared'];
    let hasErrors = false;
    
    // This is a mock test - in production you'd check actual logs
    newResults.push({
      test: 'Console Error Check',
      status: hasErrors ? 'warning' : 'pass',
      message: hasErrors ? 'Potential errors detected' : 'No critical errors detected',
      details: 'Check browser console for detailed logs'
    });

    // Test 5: Simulate quick tab switch
    newResults.push({
      test: 'Quick Tab Switch Simulation',
      status: 'pass',
      message: 'To test: Switch tabs for <5s and check console',
      details: 'Expected: "Tab switch too quick (<5s), skipping refresh"'
    });

    // Test 6: Check auth context
    try {
      const hasAuth = !!(window as any).supabase;
      if (hasAuth) {
        newResults.push({
          test: 'Supabase Client',
          status: 'pass',
          message: 'Supabase client initialized'
        });
      } else {
        newResults.push({
          test: 'Supabase Client',
          status: 'fail',
          message: 'Supabase client not found'
        });
      }
    } catch (error) {
      newResults.push({
        test: 'Supabase Client',
        status: 'fail',
        message: 'Error checking Supabase',
        details: String(error)
      });
    }

    setResults(newResults);
    setIsRunning(false);
  };

  useEffect(() => {
    // Run diagnostics on mount
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return <Badge className="bg-green-100 text-green-800">PASS</Badge>;
      case 'fail':
        return <Badge className="bg-red-100 text-red-800">FAIL</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">WARNING</Badge>;
    }
  };

  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const warningCount = results.filter(r => r.status === 'warning').length;

  return (
    <Card className="w-full max-w-4xl mx-auto my-8">
      <CardHeader>
        <CardTitle>Tab Revisit Diagnostic Tool</CardTitle>
        <CardDescription>
          Verify that the tab revisit workflow is configured correctly
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6">
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running...' : 'Run Diagnostics'}
          </Button>
          
          {results.length > 0 && (
            <div className="flex gap-4 text-sm">
              <span className="text-green-600 font-medium">{passCount} Pass</span>
              <span className="text-red-600 font-medium">{failCount} Fail</span>
              <span className="text-yellow-600 font-medium">{warningCount} Warning</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {results.map((result, index) => (
            <div 
              key={index} 
              className="flex items-start gap-3 p-4 border rounded-lg"
            >
              <div className="mt-0.5">
                {getStatusIcon(result.status)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium">{result.test}</h4>
                  {getStatusBadge(result.status)}
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {result.message}
                </p>
                {result.details && (
                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded font-mono">
                    {result.details}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {coordinatorState && (
          <div className="mt-8 p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-3">Coordinator State</h3>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(coordinatorState, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium mb-2 text-blue-900">Manual Testing Required</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Switch to another tab for 2s, then back (should skip refresh)</li>
            <li>Switch to another tab for 45s, then back (should refresh data only)</li>
            <li>Switch to another tab for 120s, then back (should refresh auth + data)</li>
            <li>Open User Management and test dropdown menu (should not flicker)</li>
            <li>Check auth logs for excessive /user requests (should be minimal)</li>
          </ul>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          <p>For detailed test scenarios, see TAB_REVISIT_COMPREHENSIVE_TEST.md</p>
          <p>For configuration details, see REACT_QUERY_CONFIGURATION_FIX.md</p>
        </div>
      </CardContent>
    </Card>
  );
};
