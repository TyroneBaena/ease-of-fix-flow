
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const QuickActionsCard: React.FC = () => {
  return (
    <Card className="p-6">
      <h2 className="font-semibold mb-4">Quick Actions</h2>
      <div className="space-y-2">
        <Button variant="outline" className="w-full justify-start">
          View Calendar
        </Button>
        <Button variant="outline" className="w-full justify-start">
          Update Profile
        </Button>
      </div>
    </Card>
  );
};
