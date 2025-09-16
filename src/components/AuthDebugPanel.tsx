import React from 'react';
import { useUserContext } from '@/contexts/UnifiedAuthContext';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const AuthDebugPanel = () => {
  const { currentUser, loading: userContextLoading } = useUserContext();

  return (
    <Card className="mb-6 border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-yellow-800">🔍 Auth Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <div className="space-y-2">
          <div>
            <strong>UserContext:</strong> {userContextLoading ? 'Loading...' : currentUser ? `${currentUser.name} (${currentUser.role})` : 'No user'}
          </div>
          <div>
            <strong>Current URL:</strong> {window.location.pathname}
          </div>
          <div>
            <strong>Loading State:</strong> {userContextLoading.toString()}
          </div>
          {currentUser && (
            <div>
              <strong>User Details:</strong>
              <pre className="text-xs mt-1 p-2 bg-yellow-100 rounded">
                {JSON.stringify(currentUser, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthDebugPanel;