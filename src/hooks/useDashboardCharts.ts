import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { subDays, format } from 'date-fns';

export function useDashboardCharts(shopId: string | undefined) {
  return useQuery({
    queryKey: ['dashboardCharts', shopId],
    queryFn: async () => {
      if (!shopId) return null;

      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      // 1. Fetch Quotes vs Sales (Last 30 Days)
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('created_at, status')
        .eq('shop_id', shopId)
        .gte('created_at', thirtyDaysAgo);

      if (quotesError) throw quotesError;

      // Group by day for the chart
      const dailyStats: Record<string, { date: string; quotes: number; sales: number }> = {};
      
      // Initialize last 30 days with 0
      for (let i = 29; i >= 0; i--) {
        const dateStr = format(subDays(new Date(), i), 'MMM dd');
        dailyStats[dateStr] = { date: dateStr, quotes: 0, sales: 0 };
      }

      quotesData?.forEach(quote => {
        const dateStr = format(new Date(quote.created_at), 'MMM dd');
        if (dailyStats[dateStr]) {
          dailyStats[dateStr].quotes += 1;
          if (quote.status === 'won') {
            dailyStats[dateStr].sales += 1;
          }
        }
      });

      const trendData = Object.values(dailyStats);

      // 2. Fetch Top Selling Products
      // MED-06: Join query to prevent N+1 query URL length explosion
      const { data: wonQuotes, error: topError } = await supabase
        .from('quotes')
        .select('id')
        .eq('shop_id', shopId)
        .eq('status', 'won')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(100);

      if (topError) throw topError;

      let topProductsData: { name: string; value: number }[] = [];

      if (wonQuotes && wonQuotes.length > 0) {
        const quoteIds = wonQuotes.map(q => q.id);
        const { data: items, error: itemsError } = await supabase
          .from('quote_items')
          .select('quantity, products(name)')
          .in('quote_id', quoteIds);

        if (itemsError) throw itemsError;

        const productCounts: Record<string, number> = {};
        items?.forEach((item: any) => {
          const name = item.products?.name || 'Unknown';
          productCounts[name] = (productCounts[name] || 0) + item.quantity;
        });

        topProductsData = Object.entries(productCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5); // Top 5
      }

      return {
        trendData,
        topProductsData,
      };
    },
    enabled: !!shopId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}
