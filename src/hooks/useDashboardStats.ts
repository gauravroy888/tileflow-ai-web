import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Customer } from '../types';

interface DashboardStats {
  followUpsCount: number;
  projectLeadsCount: number;
  openQuotesTotal: number;
  recentSalesCount: number;
  followUpList: Customer[];
}

export function useDashboardStats(shopId: string | undefined) {
  const [stats, setStats] = useState<DashboardStats>({
    followUpsCount: 0,
    projectLeadsCount: 0,
    openQuotesTotal: 0,
    recentSalesCount: 0,
    followUpList: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId) return;

    const fetchStats = async () => {
      setLoading(true);

      // Fetch customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('shop_id', shopId);

      // Fetch quotes
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('total_amount, status')
        .eq('shop_id', shopId);

      if (!customersError && customersData) {
        const followUps = customersData.filter(c => c.visit_status === 'follow_up');
        // Sort follow-ups by created_at desc (newest first)
        const sortedFollowUps = followUps.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        setStats(prev => ({
          ...prev,
          followUpsCount: followUps.length,
          projectLeadsCount: customersData.length,
          followUpList: sortedFollowUps.slice(0, 5), // top 5
        }));
      }

      if (!quotesError && quotesData) {
        // Open quotes total
        const total = quotesData.reduce((sum, quote) => sum + (Number(quote.total_amount) || 0), 0);
        
        setStats(prev => ({
          ...prev,
          openQuotesTotal: total,
          recentSalesCount: quotesData.length,
        }));
      }

      setLoading(false);
    };

    fetchStats();
  }, [shopId]);

  return { stats, loading };
}
