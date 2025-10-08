import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Zap, Calendar, DollarSign, Users, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const Phase2TestingPanel: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const triggerAutoConvert = async () => {
    setTesting(true);
    setResults(null);
    
    try {
      console.log('[Phase2TestingPanel] Starting auto-convert-trials invocation...');
      toast({
        title: "🔄 Processing Trials",
        description: "Converting expired trials with payment methods... This may take up to 2 minutes.",
      });
      
      // Increase timeout for Stripe operations (creating products, prices, subscriptions)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 120 seconds')), 120000)
      );
      
      const invokePromise = supabase.functions.invoke('auto-convert-trials', {
        body: {}
      });
      
      console.log('[Phase2TestingPanel] Waiting for response...');
      const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;
      
      console.log('[Phase2TestingPanel] Response received:', { data, error });
      
      if (error) {
        console.error('[Phase2TestingPanel] Function returned error:', error);
        throw new Error(error.message || JSON.stringify(error));
      }
      
      setResults({ type: 'auto-convert', data });
      toast({
        title: "✅ Auto-Convert Completed",
        description: `Processed ${data?.conversions_processed || 0} trial conversions`,
      });
    } catch (error: any) {
      console.error('[Phase2TestingPanel] Error caught:', error);
      
      const errorMessage = error.message || error.toString() || 'Unknown error occurred';
      
      toast({
        title: "❌ Auto-Convert Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      setResults({ 
        type: 'auto-convert', 
        data: { 
          error: errorMessage,
          conversions_processed: 0 
        } 
      });
    } finally {
      setTesting(false);
      console.log('[Phase2TestingPanel] Auto-convert process finished');
    }
  };

  const triggerBillingAdjustment = async () => {
    setTesting(true);
    setResults(null);
    
    try {
      console.log('[Phase2TestingPanel] Starting billing adjustment invocation...');
      console.log('[Phase2TestingPanel] This may take 30-60 seconds if there are many subscriptions...');
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 90 seconds - function may still be running')), 90000)
      );
      
      const invokePromise = supabase.functions.invoke('adjust-subscription-billing', {
        body: {}
      });
      
      console.log('[Phase2TestingPanel] Waiting for response...');
      const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;
      
      console.log('[Phase2TestingPanel] Response received:', { data, error });
      
      if (error) {
        console.error('[Phase2TestingPanel] Function returned error:', error);
        throw new Error(error.message || JSON.stringify(error));
      }
      
      const adjustmentsCount = data?.adjustments_processed || 0;
      const details = data?.details || [];
      
      // Show detailed info about what happened
      let description = `Processed ${adjustmentsCount} subscription${adjustmentsCount !== 1 ? 's' : ''}`;
      
      if (adjustmentsCount === 0) {
        description = 'No active subscriptions found to adjust';
      } else {
        const adjusted = details.filter((d: any) => d.status === 'adjusted').length;
        const noChange = details.filter((d: any) => d.status === 'no_change_needed').length;
        const cancelled = details.filter((d: any) => d.status === 'cancelled_no_properties').length;
        
        if (adjusted > 0) description += ` (${adjusted} adjusted`;
        if (noChange > 0) description += adjusted > 0 ? `, ${noChange} unchanged` : ` (${noChange} unchanged`;
        if (cancelled > 0) description += adjusted > 0 || noChange > 0 ? `, ${cancelled} cancelled` : ` (${cancelled} cancelled`;
        description += ')';
      }
      
      setResults({ type: 'billing-adjustment', data });
      toast({
        title: "✅ Billing Adjustment Completed",
        description,
        duration: 8000,
      });
    } catch (error: any) {
      console.error('[Phase2TestingPanel] Error caught:', error);
      
      const errorMessage = error.message || error.toString() || 'Unknown error occurred';
      
      toast({
        title: "❌ Billing Adjustment Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 8000,
      });
      
      setResults({ 
        type: 'billing-adjustment', 
        data: { 
          error: errorMessage,
          adjustments_processed: 0 
        } 
      });
    } finally {
      setTesting(false);
      console.log('[Phase2TestingPanel] Billing adjustment process finished');
    }
  };

  const triggerTrialReminders = async () => {
    setTesting(true);
    setResults(null);
    
    try {
      console.log('[Phase2TestingPanel] Starting trial reminders invocation...');
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 60 seconds')), 60000)
      );
      
      const invokePromise = supabase.functions.invoke('check-trial-reminders', {
        body: {}
      });
      
      console.log('[Phase2TestingPanel] Waiting for response...');
      const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;
      
      console.log('[Phase2TestingPanel] Response received:', { data, error });
      
      if (error) {
        console.error('[Phase2TestingPanel] Function returned error:', error);
        throw new Error(error.message || JSON.stringify(error));
      }
      
      setResults({ type: 'trial-reminders', data });
      toast({
        title: "✅ Trial Reminders Sent",
        description: `Sent ${data?.reminders_sent || 0} reminder emails`,
      });
    } catch (error: any) {
      console.error('[Phase2TestingPanel] Error caught:', error);
      
      const errorMessage = error.message || error.toString() || 'Unknown error occurred';
      
      toast({
        title: "❌ Trial Reminders Failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      setResults({ 
        type: 'trial-reminders', 
        data: { 
          error: errorMessage,
          reminders_sent: 0 
        } 
      });
    } finally {
      setTesting(false);
      console.log('[Phase2TestingPanel] Trial reminders process finished');
    }
  };

  const setupTestData = async () => {
    setTesting(true);
    setResults(null);
    
    try {
      console.log('[Phase2TestingPanel] Setting up real Stripe test data...');
      
      toast({
        title: "🔄 Creating Test Data",
        description: "Setting up Stripe customers, subscriptions, and test scenarios...",
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 90 seconds')), 90000)
      );
      
      const invokePromise = supabase.functions.invoke('setup-phase2-test-data', {
        body: {}
      });
      
      console.log('[Phase2TestingPanel] Waiting for test data setup...');
      const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;
      
      console.log('[Phase2TestingPanel] Setup response:', { data, error });
      
      if (error) {
        console.error('[Phase2TestingPanel] Function returned error:', error);
        throw new Error(error.message || JSON.stringify(error));
      }
      
      setResults({ type: 'test-setup', data: data });
      toast({
        title: "✅ Test Data Created",
        description: `Created ${data?.test_scenarios?.length || 0} test scenarios with real Stripe integration`,
        duration: 10000,
      });
    } catch (error: any) {
      console.error('[Phase2TestingPanel] Error caught:', error);
      
      const errorMessage = error.message || error.toString() || 'Unknown error occurred';
      
      toast({
        title: "❌ Test Data Setup Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 8000,
      });
      
      setResults({ 
        type: 'test-setup', 
        data: { error: errorMessage } 
      });
    } finally {
      setTesting(false);
      console.log('[Phase2TestingPanel] Test data setup process finished');
    }
  };

  const checkCronJobs = async () => {
    setTesting(true);
    setResults(null);
    
    try {
      console.log('[Phase2TestingPanel] Checking cron jobs via edge function...');
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
      );
      
      const invokePromise = supabase.functions.invoke('check-cron-status', {
        body: {}
      });
      
      console.log('[Phase2TestingPanel] Waiting for cron status...');
      const { data, error } = await Promise.race([invokePromise, timeoutPromise]) as any;
      
      console.log('[Phase2TestingPanel] Cron status received:', { data, error });
      
      if (error) {
        console.error('[Phase2TestingPanel] Function returned error:', error);
        throw new Error(error.message || JSON.stringify(error));
      }
      
      const cronJobs = data?.jobs || [];
      setResults({ type: 'cron-jobs', data: cronJobs });
      toast({
        title: "✅ Cron Jobs Retrieved",
        description: `Found ${cronJobs.length} scheduled job${cronJobs.length !== 1 ? 's' : ''}`,
      });
    } catch (error: any) {
      console.error('[Phase2TestingPanel] Error caught:', error);
      
      const errorMessage = error.message || error.toString() || 'Unknown error occurred';
      
      toast({
        title: "❌ Failed to Retrieve Cron Jobs",
        description: errorMessage,
        variant: "destructive",
      });
      
      setResults({ 
        type: 'cron-jobs', 
        data: [] 
      });
    } finally {
      setTesting(false);
      console.log('[Phase2TestingPanel] Check cron jobs process finished');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Phase 2: Automated Billing Testing Panel
        </CardTitle>
        <CardDescription>
          Manually trigger automated processes for testing Phase 2 implementation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertDescription>
            ⚠️ Admin Only: These functions are normally triggered automatically by cron jobs.
            Use this panel only for testing and verification.
          </AlertDescription>
        </Alert>

        {/* Setup Test Data Button */}
        <Button
          onClick={setupTestData}
          disabled={testing}
          className="h-24 flex-col gap-2"
          variant="default"
        >
          {testing ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <Zap className="h-6 w-6" />
              <div className="text-center">
                <div className="font-bold text-base">Setup Real Test Data</div>
                <div className="text-xs opacity-80">Creates Stripe customers & test scenarios</div>
              </div>
            </>
          )}
        </Button>

        {/* Action Buttons */}
        <div className="grid gap-4 md:grid-cols-2">
          <Button
            onClick={triggerAutoConvert}
            disabled={testing}
            className="h-20 flex-col gap-2"
          >
            {testing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Users className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-semibold">Auto-Convert Trials</div>
                  <div className="text-xs opacity-80">Converts expired trials to paid</div>
                </div>
              </>
            )}
          </Button>

          <Button
            onClick={triggerBillingAdjustment}
            disabled={testing}
            className="h-20 flex-col gap-2"
            variant="secondary"
          >
            {testing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <DollarSign className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-semibold">Adjust Billing</div>
                  <div className="text-xs opacity-80">Updates subscription amounts</div>
                </div>
              </>
            )}
          </Button>

          <Button
            onClick={triggerTrialReminders}
            disabled={testing}
            className="h-20 flex-col gap-2"
            variant="outline"
          >
            {testing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Calendar className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-semibold">Trial Reminders</div>
                  <div className="text-xs opacity-80">Sends reminder emails</div>
                </div>
              </>
            )}
          </Button>

          <Button
            onClick={checkCronJobs}
            disabled={testing}
            className="h-20 flex-col gap-2"
            variant="outline"
          >
            {testing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-semibold">Check Cron Jobs</div>
                  <div className="text-xs opacity-80">View scheduled tasks</div>
                </div>
              </>
            )}
          </Button>
        </div>

        {/* Results Display */}
        {results && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {results.type === 'test-setup' && 'Test Data Setup Results'}
                {results.type === 'auto-convert' && 'Auto-Convert Results'}
                {results.type === 'billing-adjustment' && 'Billing Adjustment Results'}
                {results.type === 'trial-reminders' && 'Trial Reminder Results'}
                {results.type === 'cron-jobs' && 'Cron Jobs Status'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setResults(null)}
              >
                Clear
              </Button>
            </div>

            <div className="bg-muted rounded-lg p-4 space-y-3">
              {results.type === 'test-setup' && (
                <>
                  {results.data.test_scenarios?.map((scenario: any, idx: number) => (
                    <div key={idx} className="border-t pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{scenario.scenario}</span>
                        <Badge variant="default">{scenario.status}</Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <div><strong>Email:</strong> {scenario.email}</div>
                        {scenario.stripe_customer_id && (
                          <div><strong>Stripe Customer:</strong> {scenario.stripe_customer_id}</div>
                        )}
                        {scenario.stripe_subscription_id && (
                          <div><strong>Subscription:</strong> {scenario.stripe_subscription_id}</div>
                        )}
                        {scenario.expected_amount && (
                          <div><strong>Expected Amount:</strong> {scenario.expected_amount}</div>
                        )}
                        {scenario.adjustment_needed && (
                          <div className="text-orange-600 dark:text-orange-400">
                            <strong>Adjustment:</strong> {scenario.adjustment_needed}
                          </div>
                        )}
                        {scenario.trial_end_date && (
                          <div><strong>Trial Ends:</strong> {scenario.trial_end_date}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {results.data.next_steps && (
                    <div className="border-t pt-3 mt-3">
                      <div className="font-semibold mb-2">Next Steps:</div>
                      <ul className="text-xs space-y-1">
                        {results.data.next_steps.map((step: string, idx: number) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
              
              {results.type === 'auto-convert' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Conversions Processed:</span>
                    <Badge>{results.data.conversions_processed}</Badge>
                  </div>
                  {results.data.details?.map((detail: any, idx: number) => (
                    <div key={idx} className="border-t pt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{detail.email}</span>
                        <Badge variant={detail.status === 'converted' ? 'default' : 'secondary'}>
                          {detail.status}
                        </Badge>
                      </div>
                      {detail.monthly_amount && (
                        <div className="text-xs text-muted-foreground">
                          ${detail.monthly_amount}/mo for {detail.property_count} properties
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {results.type === 'billing-adjustment' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Adjustments Processed:</span>
                    <Badge>{results.data.adjustments_processed}</Badge>
                  </div>
                  {results.data.details?.map((detail: any, idx: number) => (
                    <div key={idx} className="border-t pt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{detail.email}</span>
                        <Badge variant={detail.status === 'adjusted' ? 'default' : 'secondary'}>
                          {detail.status}
                        </Badge>
                      </div>
                      {detail.old_amount && detail.new_amount && (
                        <div className="text-xs text-muted-foreground">
                          ${detail.old_amount} → ${detail.new_amount} ({detail.property_count} properties)
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {results.type === 'trial-reminders' && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Reminders Sent:</span>
                    <Badge>{results.data.reminders_sent}</Badge>
                  </div>
                  {results.data.details?.map((detail: any, idx: number) => (
                    <div key={idx} className="border-t pt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{detail.email}</span>
                        <Badge>{detail.days_remaining} days left</Badge>
                        <Badge variant={detail.status === 'sent' ? 'default' : 'destructive'}>
                          {detail.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {results.type === 'cron-jobs' && (
                <>
                  <div className="space-y-2">
                    {results.data?.map((job: any, idx: number) => (
                      <div key={idx} className="border-t pt-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{job.jobname}</span>
                          <Badge variant={job.active ? 'default' : 'secondary'}>
                            {job.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Schedule: {job.schedule}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Information */}
        <Alert>
          <AlertDescription className="text-sm space-y-2">
            <div className="font-semibold">Automated Schedule:</div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Auto-Convert Trials: Daily at 2:00 AM</li>
              <li>Adjust Billing: Monthly on 1st at 3:00 AM</li>
              <li>Trial Reminders: Daily at 10:00 AM</li>
            </ul>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
