import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const EmailTestButton = () => {
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const testEmailFunction = async () => {
    if (!testEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;
      
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('test-landlord-email', {
        body: { test_email: testEmail },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        console.error('Test email error:', error);
        toast.error(`Test failed: ${error.message}`);
      } else {
        console.log('Test email success:', data);
        toast.success('Test email sent successfully! Check your inbox.');
      }
    } catch (error) {
      console.error('Email test error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Test Email Notifications</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="email"
          placeholder="Enter your email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
        />
        <Button 
          onClick={testEmailFunction}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Sending...' : 'Send Test Email'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EmailTestButton;