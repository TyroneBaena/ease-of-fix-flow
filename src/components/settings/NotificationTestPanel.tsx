import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Bell, Mail, MessageSquare, Loader2 } from 'lucide-react';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { sendPushNotification } from '@/utils/notificationUtils';
import { supabase } from '@/integrations/supabase/client';

export const NotificationTestPanel: React.FC = () => {
  const { currentUser } = useUserContext();
  const [testing, setTesting] = useState<string | null>(null);

  const testInAppNotification = async () => {
    setTesting('in-app');
    try {
      // This toast respects the user's appNotifications preference
      toast.success('🎉 Test in-app notification!', {
        description: 'If you can see this, in-app notifications are working correctly.'
      });
    } finally {
      setTimeout(() => setTesting(null), 1000);
    }
  };

  const testPushNotification = async () => {
    if (!currentUser?.id) {
      toast.error('User not found');
      return;
    }
    
    setTesting('push');
    
    try {
      console.log('🧪 Starting push notification test for user:', currentUser.id);
      
      const result = await sendPushNotification(
        currentUser.id,
        '🔔 HousingHub Notification',
        'This is a test push notification. If you see this, push notifications are working!',
        '/favicon.ico'
      );
      
      console.log('🧪 Push notification result:', result);
      
      if (result) {
        toast.success('Push notification sent! Check your browser notifications.');
      } else {
        toast.error('Failed to send push notification. Make sure you have granted permission.');
      }
    } catch (error) {
      console.error('Error testing push notification:', error);
      toast.error('An error occurred while testing push notifications.');
    } finally {
      setTesting(null);
    }
  };

  const testEmailNotification = async () => {
    if (!currentUser?.id || !currentUser?.email) return;
    
    setTesting('email');
    try {
      // Check if user has email notifications enabled
      const { data: profile } = await supabase
        .from('profiles')
        .select('notification_settings')
        .eq('id', currentUser.id)
        .single();

      const notificationSettings = profile?.notification_settings as any;
      const emailEnabled = notificationSettings?.emailNotifications ?? true;

      if (!emailEnabled) {
        toast.error('Email notifications are disabled in your settings. Please enable them first.');
        return;
      }

      toast.info('📧 Email notification test', {
        description: 'To test email notifications, add a comment to any maintenance request. You will receive an email if notifications are enabled.'
      });
    } catch (error) {
      console.error('Error testing email notification:', error);
      toast.error('Failed to test email notification');
    } finally {
      setTimeout(() => setTesting(null), 1000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Notifications</CardTitle>
        <CardDescription>
          Test each notification type to ensure they're working correctly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          onClick={testInAppNotification}
          disabled={testing !== null}
          className="w-full justify-start"
          variant="outline"
        >
          {testing === 'in-app' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <MessageSquare className="mr-2 h-4 w-4" />
          )}
          Test In-App Notification
        </Button>

        <Button
          onClick={testPushNotification}
          disabled={testing !== null}
          className="w-full justify-start"
          variant="outline"
        >
          {testing === 'push' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Bell className="mr-2 h-4 w-4" />
          )}
          Test Push Notification
        </Button>

        <Button
          onClick={testEmailNotification}
          disabled={testing !== null}
          className="w-full justify-start"
          variant="outline"
        >
          {testing === 'email' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Mail className="mr-2 h-4 w-4" />
          )}
          Test Email Notification
        </Button>
      </CardContent>
    </Card>
  );
};
