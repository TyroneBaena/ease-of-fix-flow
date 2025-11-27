
import { supabase } from '@/lib/supabase';
import { NotificationClient } from '@/types/notification';
import { toast } from 'sonner';
import { checkNotificationPreference } from '@/utils/notificationUtils';

/**
 * Service for handling real-time notification updates
 */
class NotificationService {
  private static instance: NotificationService;
  private activeSubscriptions: Map<string, any> = new Map();

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Subscribe to real-time notification updates for a specific user
   */
  subscribeToUserNotifications(
    userId: string, 
    onNewNotification: (notification: NotificationClient) => void
  ) {
    // Clean up existing subscription for this user
    this.unsubscribeFromUserNotifications(userId);

    console.log(`Subscribing to notifications for user: ${userId}`);

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          console.log('New notification received:', payload);
          
          if (payload.new) {
            const notification: NotificationClient = {
              id: payload.new.id,
              title: payload.new.title,
              message: payload.new.message,
              isRead: payload.new.is_read,
              createdAt: payload.new.created_at,
              type: payload.new.type,
              link: payload.new.link,
              user_id: payload.new.user_id
            };

            // Check if user has in-app notifications enabled before showing toast
            const hasAppNotifications = await checkNotificationPreference(userId, 'appNotifications');
            
            if (hasAppNotifications) {
              toast.info(notification.title, {
                description: notification.message,
                duration: 5000,
              });
            } else {
              console.log('In-app notifications disabled for user, skipping toast');
            }

            // Always call the callback to update the notification list
            onNewNotification(notification);
          }
        }
      )
      .subscribe();

    // Store the subscription
    this.activeSubscriptions.set(userId, channel);
  }

  /**
   * Unsubscribe from notifications for a specific user
   */
  unsubscribeFromUserNotifications(userId: string) {
    const existingSubscription = this.activeSubscriptions.get(userId);
    if (existingSubscription) {
      console.log(`Unsubscribing from notifications for user: ${userId}`);
      supabase.removeChannel(existingSubscription);
      this.activeSubscriptions.delete(userId);
    }
  }

  /**
   * Clean up all subscriptions
   */
  cleanup() {
    console.log('Cleaning up all notification subscriptions');
    this.activeSubscriptions.forEach((channel, userId) => {
      supabase.removeChannel(channel);
    });
    this.activeSubscriptions.clear();
  }
}

export const notificationService = NotificationService.getInstance();
