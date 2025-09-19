import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ShieldAlert, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityCheck {
  check_name: string;
  violation_count: number;
  status: 'PASS' | 'CRITICAL_FAILURE';
}

export const SecurityComplianceMonitor = () => {
  const [checks, setChecks] = useState<SecurityCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const runSecurityChecks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_security_compliance_status');
      
      if (error) {
        return;
      }

      // Type cast the status field to match our interface
      setChecks(data?.map(item => ({
        ...item,
        status: item.status as 'PASS' | 'CRITICAL_FAILURE'
      })) || []);
      setLastChecked(new Date());
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSecurityChecks();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(runSecurityChecks, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const hasViolations = checks.some(check => check.status === 'CRITICAL_FAILURE');

  return (
    <Card className={hasViolations ? 'border-red-500' : 'border-green-500'}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {hasViolations ? (
              <ShieldAlert className="h-5 w-5 text-red-500" />
            ) : (
              <Shield className="h-5 w-5 text-green-500" />
            )}
            Security Compliance Monitor
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={runSecurityChecks}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {checks.map((check) => (
            <div key={check.check_name} className="flex items-center justify-between">
              <span className="font-medium">{check.check_name}</span>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={check.status === 'PASS' ? 'default' : 'destructive'}
                  className={check.status === 'PASS' ? 'bg-green-100 text-green-800' : ''}
                >
                  {check.status === 'PASS' ? '✓ PASS' : `✗ FAIL (${check.violation_count})`}
                </Badge>
              </div>
            </div>
          ))}
          
          {lastChecked && (
            <div className="text-xs text-muted-foreground mt-4">
              Last checked: {lastChecked.toLocaleString()}
            </div>
          )}
          
          {hasViolations && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800 font-medium">
                🚨 CRITICAL: Security violations detected!
              </p>
              <p className="text-xs text-red-600 mt-1">
                Cross-organization data access has been found. Contact system administrator immediately.
              </p>
            </div>
          )}
          
          {!hasViolations && checks.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800 font-medium">
                ✅ All security checks passed
              </p>
              <p className="text-xs text-green-600 mt-1">
                Multi-tenant isolation is properly enforced.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};