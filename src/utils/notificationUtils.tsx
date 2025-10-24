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
    console.log('🔍 Checking notification preference:', { userId, preferenceType });
    
    const { data, error } = await supabase
      .from('profiles')
      .select('notification_settings')
      .eq('id', userId)
      .single();

    console.log('🔍 Preference query result:', { data, error });

    if (error || !data?.notification_settings) {
      // Default to true if we can't fetch preferences
      console.warn('Could not fetch notification preferences, defaulting to enabled');
      return true;
    }

    const settings = data.notification_settings as any;
    const result = settings[preferenceType] ?? true;
    console.log('🔍 Preference result:', { preferenceType, result });
    return result;
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
): Promise<boolean> => {
  try {
    console.log('🔔 sendPushNotification called:', { userId, title, body });
    
    // Check user preferences
    const hasPermission = await checkNotificationPreference(userId, 'pushNotifications');
    console.log('🔔 Push notification preference:', hasPermission);
    
    if (!hasPermission) {
      console.log('Push notifications disabled by user preference');
      return false;
    }

    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    console.log('🔔 Browser Notification.permission:', Notification.permission);

    if (Notification.permission === 'granted') {
      try {
        console.log('🔔 Creating notification with granted permission...');
        
        // Create a promise that resolves when notification is shown
        return new Promise<boolean>((resolve, reject) => {
          try {
            // Use timestamp to ensure each notification is unique
            const notification = new Notification(title, {
              body,
              icon: icon || '/favicon.ico',
              badge: '/favicon.ico',
              tag: `housing-hub-${Date.now()}`,
              requireInteraction: false,
              silent: false
            });
            
            console.log('🔔 Notification object created:', notification);
            
            // Resolve when notification is shown
            notification.onshow = () => {
              console.log('✅ Notification displayed successfully');
              resolve(true);
            };
            
            // Reject if there's an error
            notification.onerror = (error) => {
              console.error('❌ Notification error:', error);
              reject(new Error('Notification failed to display'));
            };
            
            // Handle click
            notification.onclick = () => {
              console.log('🖱️ Notification clicked');
              window.focus();
              notification.close();
            };
            
            // Timeout fallback - if onshow doesn't fire in 2 seconds, assume it worked
            setTimeout(() => {
              console.log('⏱️ Notification timeout - assuming success');
              resolve(true);
            }, 2000);
            
          } catch (error) {
            console.error('❌ Error creating notification:', error);
            reject(error);
          }
        });
      } catch (error) {
        console.error('❌ Error in notification creation:', error);
        return false;
      }
    } else if (Notification.permission === 'default') {
      console.log('🔔 Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log('🔔 Permission result:', permission);
      
      if (permission === 'granted') {
        return new Promise<boolean>((resolve, reject) => {
          try {
            const notification = new Notification(title, {
              body,
              icon: icon || '/favicon.ico',
              badge: '/favicon.ico',
              tag: `housing-hub-${Date.now()}`,
              requireInteraction: false,
              silent: false
            });
            
            console.log('🔔 Notification created after permission:', notification);
            
            notification.onshow = () => {
              console.log('✅ Notification displayed successfully after permission');
              resolve(true);
            };
            
            notification.onerror = (error) => {
              console.error('❌ Notification error:', error);
              reject(new Error('Notification failed to display'));
            };
            
            notification.onclick = () => {
              console.log('🖱️ Notification clicked');
              window.focus();
              notification.close();
            };
            
            // Timeout fallback
            setTimeout(() => {
              console.log('⏱️ Notification timeout - assuming success');
              resolve(true);
            }, 2000);
          } catch (error) {
            console.error('❌ Error creating notification:', error);
            reject(error);
          }
        });
      }
      return false;
    } else {
      console.log('🔔 Notification permission denied');
      return false;
    }
  } catch (error) {
    console.error('❌ Error in sendPushNotification:', error);
    return false;
  }
};
