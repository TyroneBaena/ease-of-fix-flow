
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { NotificationClient } from '@/types/notification';

export const fetchContractorNotifications = async (userId: string) => {
  console.log('Fetching contractor notifications for user:', userId);
  
  const { data: fetchedData, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
  
  return fetchedData;
};

export const markNotificationsAsRead = async (notificationIds: string[], userId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .in('id', notificationIds)
    .eq('user_id', userId);
  
  if (error) {
    throw error;
  }
};

export const markSingleNotificationAsRead = async (notificationId: string, userId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', userId);
  
  if (error) {
    throw error;
  }
};
