import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserContext } from '@/contexts/UnifiedAuthContext';
import { NotificationSettings } from '@/types/user';

export const useNotificationPreferences = () => {
  const { currentUser } = useUserContext();
  const [preferences, setPreferences] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    appNotifications: true
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!currentUser?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('notification_settings')
          .eq('id', currentUser.id)
          .single();

        if (error) {
          console.error('Error loading notification preferences:', error);
        } else if (data?.notification_settings) {
          setPreferences(data.notification_settings as unknown as NotificationSettings);
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [currentUser?.id]);

  const updatePreferences = async (newPreferences: NotificationSettings) => {
    if (!currentUser?.id) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_settings: newPreferences as any })
        .eq('id', currentUser.id);

      if (error) {
        console.error('Error updating notification preferences:', error);
        return false;
      }

      setPreferences(newPreferences);
      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  };

  return {
    preferences,
    loading,
    updatePreferences
  };
};
