
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface DashboardErrorStateProps {
  error: string;
  contractorId: string | null;
  refreshData: () => void;
  loading: boolean;
}

export const DashboardErrorState: React.FC<DashboardErrorStateProps> = ({
  error,
  contractorId,
  refreshData,
  loading
}) => {
  // Error state when no contractor ID is found
  if (error && !contractorId) {
    return (
      <main className="container mx-auto px-4 py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshData}
              className="ml-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
        
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Contractor Access Required</h2>
          <p className="text-gray-600 mb-4">
            You need a contractor profile to access this dashboard. Please contact your administrator to set up your contractor account.
          </p>
          <div className="bg-gray-50 p-4 rounded-lg mb-4 text-sm text-left">
            <strong>Debug Info:</strong><br/>
            Error: {error}<br/>
            Contractor ID: {contractorId || 'null'}<br/>
            Status: Missing contractor profile in database
          </div>
          <Button onClick={refreshData} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Try Again
          </Button>
        </Card>
      </main>
    );
  }

  // Error state when contractor ID exists but there's still an error
  if (error && contractorId) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return null;
};
