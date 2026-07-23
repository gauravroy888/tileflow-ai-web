import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { AppNotification } from '../types';

export function useNotifications(shopId: string | undefined) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!shopId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error);
    } else {
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    }
    setLoading(false);
  }, [shopId]);

  useEffect(() => {
    if (!shopId) return;
    
    fetchNotifications();

    // MED-05: Use safe channel name without colon/equals special chars
    const safeChannelId = `notifications-${shopId.replace(/[^a-zA-Z0-9-]/g, '')}`;
    const channel = supabase
      .channel(safeChannelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `shop_id=eq.${shopId}`,
        },
        () => {
          fetchNotifications(); // Refetch to keep sorted
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, fetchNotifications]);

  const markAllAsRead = async () => {
    if (!shopId || unreadCount === 0) return;

    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    // LOW-09: Rollback on failure
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);

    if (error) {
      console.error('Failed to mark all notifications as read:', error);
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
    }
  };

  const markAsRead = async (id: string) => {
    if (!shopId) return;

    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    // LOW-09: Rollback on failure
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      console.error('Failed to mark notification as read:', error);
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAllAsRead,
    markAsRead,
  };
}
