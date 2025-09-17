import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Shield, Users, AlertTriangle, Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Navbar from '@/components/Navbar';
import { SecurityMetricsCard } from '@/components/security/SecurityMetricsCard';
import { RecentLoginAttempts } from '@/components/security/RecentLoginAttempts';
import { useSecurityMetrics } from '@/hooks/useSecurityMetrics';
import { useUserContext } from '@/contexts/UnifiedAuthContext';

const Security: React.FC = () => {
  const { currentUser, isAdmin } = useUserContext();
  const { metrics, loading, error, refetch } = useSecurityMetrics();

  // Debug logging
  React.useEffect(() => {
    console.log('🎯 [Security Page] Metrics updated:', {
      failedLoginsToday: metrics.failedLoginsToday,
      totalLoginsToday: metrics.totalLoginsToday,
      activeSessionsCount: metrics.activeSessionsCount,
      recentAttempts: metrics.recentLoginAttempts.length,
      loading
    });
  }, [metrics, loading]);

  // Redirect non-admin users
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Determine if there are any security concerns
  const hasSecurityConcerns = metrics.failedLoginsToday > 5;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Shield className="h-8 w-8 text-blue-600" />
                Security Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Monitor your organization's security metrics and recent activities
              </p>
            </div>
            
            <Button 
              onClick={refetch} 
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Security Concerns Alert */}
        {hasSecurityConcerns && !loading && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Security Alert:</strong> Elevated number of failed login attempts today ({metrics.failedLoginsToday}). 
              Please review recent activities below.
            </AlertDescription>
          </Alert>
        )}

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <SecurityMetricsCard
            title="Active Sessions"
            value={loading ? '...' : metrics.activeSessionsCount}
            description="Currently active user sessions"
            icon={Users}
            variant="default"
          />
          
          <SecurityMetricsCard
            title="Failed Logins Today"
            value={loading ? '...' : metrics.failedLoginsToday}
            description="Failed authentication attempts today"
            icon={AlertTriangle}
            variant={metrics.failedLoginsToday > 5 ? 'danger' : metrics.failedLoginsToday > 2 ? 'warning' : 'default'}
          />
          
          <SecurityMetricsCard
            title="Total Logins Today"
            value={loading ? '...' : metrics.totalLoginsToday}
            description="Successful and failed login attempts"
            icon={Activity}
            variant="default"
          />
        </div>

        {/* Recent Login Attempts */}
        <RecentLoginAttempts 
          attempts={metrics.recentLoginAttempts}
          loading={loading}
        />

        {/* Additional Info */}
        <div className="mt-8 text-sm text-gray-500">
          <p>
            <strong>Note:</strong> Security metrics are refreshed every 5 minutes. 
            Data includes login attempts from the last 48 hours.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Security;