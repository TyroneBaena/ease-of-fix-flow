import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useSubscription } from '@/contexts/subscription/SubscriptionContext';
import { useToast } from '@/hooks/use-toast';

export const PropertySyncButton: React.FC = () => {
  const [syncing, setSyncing] = useState(false);
  const { refreshPropertyCount } = useSubscription();
  const { toast } = useToast();

  const handleSync = async () => {
    setSyncing(true);
    try {
      await refreshPropertyCount();
      toast({
        title: 'Property Count Synced',
        description: 'Your property count has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: 'Failed to sync property count. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={syncing}
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
      {syncing ? 'Syncing...' : 'Sync Property Count'}
    </Button>
  );
};
