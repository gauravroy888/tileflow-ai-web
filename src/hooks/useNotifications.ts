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

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`notifications:shop_id=eq.${shopId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `shop_id=eq.${shopId}`,
        },
        () => {
          fetchNotifications(); // Simply refetch to keep it robust and sorted
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, fetchNotifications]);

  const markAllAsRead = async () => {
    if (!shopId || unreadCount === 0) return;

    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    
    // Optimistic UI update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);
  };

  const markAsRead = async (id: string) => {
    if (!shopId) return;

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAllAsRead,
    markAsRead,
  };
}
