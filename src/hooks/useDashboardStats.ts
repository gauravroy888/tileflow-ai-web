import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Customer } from '../types';

export interface DashboardStats {
  followUpsCount: number;
  projectLeadsCount: number;
  openQuotesTotal: number;
  recentSalesCount: number;
  followUpList: Customer[];
}

export function useDashboardStats(shopId: string | undefined) {
  const { data: stats, isLoading: loading } = useQuery({
    queryKey: ['dashboardStats', shopId],
    queryFn: async () => {
      if (!shopId) return null;
      
      const { data, error } = await supabase
        .rpc('get_dashboard_stats', { p_shop_id: shopId });

      if (error) throw error;
      
      if (data) {
        return {
          followUpsCount: Number(data.follow_ups_count) || 0,
          projectLeadsCount: Number(data.project_leads_count) || 0,
          openQuotesTotal: Number(data.open_quotes_total) || 0,
          recentSalesCount: Number(data.recent_sales_count) || 0,
          followUpList: data.follow_up_list || [],
        };
      }
      return null;
    },
    enabled: !!shopId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return { 
    stats: stats || {
      followUpsCount: 0,
      projectLeadsCount: 0,
      openQuotesTotal: 0,
      recentSalesCount: 0,
      followUpList: [],
    }, 
    loading 
  };
}
