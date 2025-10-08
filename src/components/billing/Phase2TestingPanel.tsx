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
    try {
      const { data, error } = await supabase.functions.invoke('auto-convert-trials');
      
      if (error) throw error;
      
      setResults({ type: 'auto-convert', data });
      toast({
        title: "Auto-Convert Triggered",
        description: `Processed ${data.conversions_processed} trial conversions`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const triggerBillingAdjustment = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('adjust-subscription-billing');
      
      if (error) throw error;
      
      setResults({ type: 'billing-adjustment', data });
      toast({
        title: "Billing Adjustment Triggered",
        description: `Processed ${data.adjustments_processed} billing adjustments`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const triggerTrialReminders = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-trial-reminders');
      
      if (error) throw error;
      
      setResults({ type: 'trial-reminders', data });
      toast({
        title: "Trial Reminders Triggered",
        description: `Sent ${data.reminders_sent} reminder emails`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const checkCronJobs = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.rpc('analytics_query', {
        query: 'SELECT * FROM cron.job ORDER BY jobname'
      });
      
      if (error) throw error;
      
      const cronJobs = Array.isArray(data) ? data : [];
      setResults({ type: 'cron-jobs', data: cronJobs });
      toast({
        title: "Cron Jobs Retrieved",
        description: `Found ${cronJobs.length} scheduled jobs`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
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
