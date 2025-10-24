
import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { User, NotificationSettings as NotificationSettingsType } from '@/types/user';
import { toast } from 'sonner';
import { Loader2, Bell, CheckCircle2 } from 'lucide-react';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { requestPushPermission } from '@/utils/notificationUtils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface NotificationSettingsProps {
  user: User;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ user }) => {
  const { preferences, loading, updatePreferences } = useNotificationPreferences();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<NotificationSettingsType>(preferences);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');

  // Update settings when preferences load
  useEffect(() => {
    if (!loading) {
      setSettings(preferences);
    }
  }, [preferences, loading]);

  // Check push notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  const handleToggle = async (settingName: keyof NotificationSettingsType) => {
    // If enabling push notifications, request permission first
    if (settingName === 'pushNotifications' && !settings.pushNotifications) {
      const permission = await requestPushPermission();
      setPushPermission(permission);
      
      if (permission !== 'granted') {
        toast.error('Please enable browser notifications in your browser settings');
        return;
      }
    }

    setSettings(prevSettings => ({
      ...prevSettings,
      [settingName]: !prevSettings[settingName]
    }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    
    try {
      const success = await updatePreferences(settings);
      
      if (success) {
        toast.success("Notification settings updated successfully");
      } else {
        toast.error("Failed to update notification settings");
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error("Failed to update notification settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pushPermission === 'denied' && settings.pushNotifications && (
        <Alert>
          <Bell className="h-4 w-4" />
          <AlertDescription>
            Browser notifications are blocked. Please enable them in your browser settings to receive push notifications.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="email-notifications">Email Notifications</Label>
            <p className="text-sm text-muted-foreground">Receive notifications via email</p>
          </div>
          <Switch 
            id="email-notifications" 
            checked={settings.emailNotifications}
            onCheckedChange={() => handleToggle('emailNotifications')}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="push-notifications">Push Notifications</Label>
            <p className="text-sm text-muted-foreground">Receive push notifications in your browser</p>
            {settings.pushNotifications && pushPermission === 'granted' && (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                <CheckCircle2 className="h-3 w-3" />
                Enabled
              </p>
            )}
          </div>
          <Switch 
            id="push-notifications" 
            checked={settings.pushNotifications}
            onCheckedChange={() => handleToggle('pushNotifications')}
          />
        </div>
        
        {/* <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="sms-notifications">SMS Notifications</Label>
            <p className="text-sm text-gray-500">Receive important alerts via text message</p>
          </div>
          <Switch 
            id="sms-notifications" 
            checked={settings.smsNotifications}
            onCheckedChange={() => handleToggle('smsNotifications')}
          />
        </div> */}
        
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="app-notifications">In-App Notifications</Label>
            <p className="text-sm text-muted-foreground">Show notifications within the application</p>
          </div>
          <Switch 
            id="app-notifications" 
            checked={settings.appNotifications}
            onCheckedChange={() => handleToggle('appNotifications')}
          />
        </div>
      </div>
      
      <Button 
        onClick={handleSave}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : 'Save Notification Settings'}
      </Button>
    </div>
  );
};

export default NotificationSettings;
