
import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { User, NotificationSettings as NotificationSettingsType } from '@/types/user';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface NotificationSettingsProps {
  user: User;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ user }) => {
  const { updateUser } = useUserContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize notification settings with defaults if not present
  const defaultSettings: NotificationSettingsType = {
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    appNotifications: true
  };
  
  const [settings, setSettings] = useState<NotificationSettingsType>(
    user.notificationSettings || defaultSettings
  );

  const handleToggle = (settingName: keyof NotificationSettingsType) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      [settingName]: !prevSettings[settingName]
    }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    
    try {
      const updatedUser = {
        ...user,
        notificationSettings: settings
      };
      
      await updateUser(updatedUser);
      toast.success("Notification settings updated successfully");
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error("Failed to update notification settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="email-notifications">Email Notifications</Label>
            <p className="text-sm text-gray-500">Receive notifications via email</p>
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
            <p className="text-sm text-gray-500">Receive push notifications in your browser</p>
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
            <p className="text-sm text-gray-500">Show notifications within the application</p>
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
