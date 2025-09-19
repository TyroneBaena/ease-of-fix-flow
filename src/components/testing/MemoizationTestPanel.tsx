import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Eye, CheckCircle } from 'lucide-react';
import RequestCard from '@/components/RequestCard';
import StatCard from '@/components/dashboard/StatCard';
import ContractorStats from '@/components/contractor/ContractorStats';
import { MaintenanceRequest } from '@/types/maintenance';

// Component to test memoization effectiveness
export const MemoizationTestPanel: React.FC = () => {
  const [renderCount, setRenderCount] = useState(0);
  const [unchangedProp, setUnchangedProp] = useState('stable value');
  const [changingProp, setChangingProp] = useState(0);
  
  // Memoized callback to prevent RequestCard from re-rendering unnecessarily
  const handleRequestClick = useCallback(() => {
    console.log('Request card clicked');
  }, []);

  // Sample maintenance request data
  const sampleRequest: MaintenanceRequest = useMemo(() => ({
    id: 'test-request-1',
    title: 'Test Maintenance Request',
    description: 'This is a test request for memoization testing',
    status: 'pending',
    priority: 'medium',
    location: 'Building A, Room 101',
    reportDate: '2024-01-15',
    createdAt: '2024-01-15T10:00:00Z',
    issueNature: 'Plumbing',
    explanation: 'Faucet is leaking in the kitchen sink',
    site: 'Main Office',
    propertyId: 'prop-1',
    submittedBy: 'test-user',
    organization_id: 'org-1',
    isParticipantRelated: false,
    participantName: '',
    attemptedFix: '',
    userId: 'test-user-id'
  }), []);

  // Force re-render of parent component
  const forceRerender = () => {
    setRenderCount(prev => prev + 1);
  };

  // Change only the changing prop
  const updateChangingProp = () => {
    setChangingProp(prev => prev + 1);
  };

  // Stats for testing
  const statsProps = useMemo(() => ({
    totalRequests: 5,
    pendingQuotes: 3,
    activeJobs: 2,
    totalQuoted: 1250
  }), []); // These values never change, so ContractorStats should not re-render

  console.log(`🧪 MemoizationTestPanel render #${renderCount + 1}`);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Memoization Test Panel
          <Badge variant="secondary">Render #{renderCount + 1}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">How to Test Memoization:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Open browser DevTools Console to see render logs</li>
            <li>Click "Force Parent Re-render" - memoized components should NOT re-render</li>
            <li>Click "Update Changing Prop" - only affected components should re-render</li>
            <li>Look for console logs starting with component names to track renders</li>
          </ol>
        </div>

        {/* Test Controls */}
        <div className="flex gap-2 flex-wrap">
          <Button onClick={forceRerender} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Force Parent Re-render
          </Button>
          <Button onClick={updateChangingProp} variant="outline">
            Update Changing Prop ({changingProp})
          </Button>
          <Badge variant="secondary">
            Unchanged Prop: {unchangedProp}
          </Badge>
        </div>

        {/* Memoized Components Test Area */}
        <div className="space-y-4">
          <h3 className="font-semibold">Memoized Components:</h3>
          
          {/* RequestCard Test */}
          <div className="border rounded p-4">
            <h4 className="font-medium mb-2">RequestCard (should only re-render when request data changes)</h4>
            <RequestCard 
              request={sampleRequest} 
              onClick={handleRequestClick}
            />
          </div>

          {/* StatCard Test */}
          <div className="border rounded p-4">
            <h4 className="font-medium mb-2">StatCard (should only re-render when value changes)</h4>
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                title="Stable Stat"
                value={100}
                icon={<CheckCircle className="h-5 w-5" />}
                color="bg-green-100 text-green-600"
                description="This value never changes"
              />
              <StatCard
                title="Changing Stat"
                value={changingProp}
                icon={<RefreshCw className="h-5 w-5" />}
                color="bg-blue-100 text-blue-600"
                description="This value changes when button is clicked"
              />
            </div>
          </div>

          {/* ContractorStats Test */}
          <div className="border rounded p-4">
            <h4 className="font-medium mb-2">ContractorStats (should not re-render with stable props)</h4>
            <ContractorStats {...statsProps} />
          </div>
        </div>

        {/* Expected Behavior */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Expected Behavior:
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>Force Parent Re-render:</strong> No memoized components should re-render</li>
            <li><strong>Update Changing Prop:</strong> Only the "Changing Stat" StatCard should re-render</li>
            <li><strong>Console logs:</strong> You should see render logs only when components actually re-render</li>
            <li><strong>Performance:</strong> Reduced re-renders improve performance, especially in lists</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};