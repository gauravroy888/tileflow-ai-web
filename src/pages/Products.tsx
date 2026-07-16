import { useEffect, useState } from 'react';
import { Search, Filter, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import { ProductCard } from '../components/ui/ProductCard';
import { Button } from '../components/ui/Button';
import { useTranslation } from 'react-i18next';

const Products = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header & Actions */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold text-textPrimary">{t('products.title')}</h2>
        <Button size="sm" className="gap-1">
          <Plus size={16} /> {t('products.add_new')}
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={t('products.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[48px]"
          />
        </div>
        <Button variant="outline" size="icon" aria-label="Filters">
          <Filter size={20} />
        </Button>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 mt-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse bg-surface rounded-xl aspect-[3/4] border border-border" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-textSecondary">{t('products.no_products')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mt-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Products;
