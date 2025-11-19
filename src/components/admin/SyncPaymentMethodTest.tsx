import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export const SyncPaymentMethodTest: React.FC = () => {
  const [email, setEmail] = useState('goyalsunny19986@gmail.com');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('[SyncTest] Starting sync for:', email);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('You must be logged in as admin');
      }

      console.log('[SyncTest] Calling sync-payment-method-for-user...');
      const { data, error: functionError } = await supabase.functions.invoke(
        'sync-payment-method-for-user',
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: { email },
        }
      );

      console.log('[SyncTest] Response:', data);

      if (functionError) {
        console.error('[SyncTest] Error:', functionError);
        throw functionError;
      }

      if (!data.success) {
        throw new Error(data.error || 'Sync failed');
      }

      setResult(data);
      console.log('[SyncTest] Success!', data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[SyncTest] Sync error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Test Payment Method Sync</CardTitle>
        <p className="text-sm text-muted-foreground">
          Sync payment method from Stripe to database for a single user
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">User Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter user email"
          />
        </div>

        <Button 
          onClick={handleSync} 
          disabled={loading || !email}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            'Sync Payment Method'
          )}
        </Button>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium text-green-800">{result.message}</p>
                {result.payment_method_id && (
                  <div className="text-sm space-y-1 text-green-700">
                    <p><strong>Payment Method ID:</strong> {result.payment_method_id}</p>
                    {result.card_info && (
                      <>
                        <p><strong>Card:</strong> {result.card_info.brand} ****{result.card_info.last4}</p>
                        <p><strong>Expires:</strong> {result.card_info.exp_month}/{result.card_info.exp_year}</p>
                      </>
                    )}
                    <p><strong>Action:</strong> {result.action}</p>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted rounded">
          <p><strong>What this does:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Checks if user exists in database</li>
            <li>Queries Stripe for payment methods attached to customer</li>
            <li>Updates database with payment_method_id if found</li>
            <li>Does NOT charge the user or create subscriptions</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
