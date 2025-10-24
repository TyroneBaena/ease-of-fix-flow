import { supabase } from '@/integrations/supabase/client';
import { toast as sonnerToast } from 'sonner';
import { NotificationSettings } from '@/types/user';

/**
 * Check if user has enabled a specific notification type
 */
export const checkNotificationPreference = async (
  userId: string,
  preferenceType: keyof NotificationSettings
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('notification_settings')
      .eq('id', userId)
      .single();

    if (error || !data?.notification_settings) {
      // Default to true if we can't fetch preferences
      console.warn('Could not fetch notification preferences, defaulting to enabled');
      return true;
    }

    return data.notification_settings[preferenceType] ?? true;
  } catch (error) {
    console.error('Error checking notification preference:', error);
    return true; // Default to enabled on error
  }
};

/**
 * Smart toast that checks user preferences before displaying
 */
export const smartToast = {
  success: async (message: string, userId?: string) => {
    if (!userId) {
      sonnerToast.success(message);
      return;
    }

    const shouldShow = await checkNotificationPreference(userId, 'appNotifications');
    if (shouldShow) {
      sonnerToast.success(message);
    }
  },
  
  error: async (message: string, userId?: string) => {
    if (!userId) {
      sonnerToast.error(message);
      return;
    }

    const shouldShow = await checkNotificationPreference(userId, 'appNotifications');
    if (shouldShow) {
      sonnerToast.error(message);
    }
  },
  
  info: async (message: string, userId?: string) => {
    if (!userId) {
      sonnerToast.info(message);
      return;
    }

    const shouldShow = await checkNotificationPreference(userId, 'appNotifications');
    if (shouldShow) {
      sonnerToast.info(message);
    }
  },
  
  loading: async (message: string, userId?: string) => {
    if (!userId) {
      sonnerToast.loading(message);
      return;
    }

    const shouldShow = await checkNotificationPreference(userId, 'appNotifications');
    if (shouldShow) {
      sonnerToast.loading(message);
    }
  }
};

/**
 * Request browser push notification permission
 */
export const requestPushPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
};

/**
 * Send browser push notification (respects user preferences)
 */
export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  icon?: string
) => {
  const hasPermission = await checkNotificationPreference(userId, 'pushNotifications');
  
  if (!hasPermission) {
    console.log('Push notifications disabled by user preference');
    return;
  }

  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return;
  }

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'housing-hub-notification'
      });
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }
};
