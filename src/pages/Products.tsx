import { useEffect, useMemo, useState } from 'react';
import { PackageSearch, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import { ProductCard } from '../components/ui/ProductCard';
import { Button } from '../components/ui/Button';
import { useTranslation } from 'react-i18next';
import { AddProductModal } from '../components/products/AddProductModal';


type ProductFilter = 'all' | 'low_stock' | string;

const Products = () => {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ProductFilter>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');
      const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', session.user.id).single();
      if (profile) setShopId(profile.shop_id);
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      setProducts((current) => current.filter((product) => product.id !== id));
    } catch (error: any) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product: ' + error.message);
    }
  };

  const filters = useMemo(() => {
    const categories = [...new Set(products.map((product) => product.category).filter(Boolean))].slice(0, 3) as string[];
    return [
      { id: 'all', label: t('products.all_items') },
      { id: 'low_stock', label: t('products.low_stock') },
      ...categories.map((category) => ({ id: category, label: category })),
    ];
  }, [products, t]);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || Boolean(product.sku?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = activeFilter === 'all' || (activeFilter === 'low_stock' ? product.stock_status === 'low_stock' : product.category === activeFilter);
    return matchesSearch && matchesFilter;
  });

  const lowStockCount = products.filter((product) => product.stock_status === 'low_stock' || product.stock_status === 'out_of_stock').length;

  return (
    <div className="page-shell mx-auto max-w-screen-xl space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{t('products.workspace')}</p>
          <h2 className="mt-0.5 text-2xl font-extrabold tracking-tight text-textPrimary">{t('products.title')}</h2>
          <p className="mt-1 text-sm text-textSecondary">{products.length} {t('products.in_catalogue')}</p>
        </div>
        <Button size="sm" className="shrink-0 gap-1.5" onClick={() => { setProductToEdit(null); setIsAddModalOpen(true); }}>
          <Plus size={18} /> {t('products.add_new')}
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="relative block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-textSecondary" size={19} />
          <input type="text" placeholder={t('products.search')} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-surface pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
        </label>
        <div className="flex items-center rounded-xl border border-[#F1D9CD] bg-accentSoft px-3 text-sm font-bold text-[#9A482A]">
          <SlidersHorizontal size={16} className="mr-2" /> {lowStockCount} {t('products.low_stock_label')}
        </div>
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
        {filters.map((filter) => <button key={filter.id} onClick={() => setActiveFilter(filter.id)} className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-extrabold transition-colors ${activeFilter === filter.id ? 'border-primary bg-primary text-background' : 'border-border bg-surface text-textSecondary hover:border-primary/30 hover:text-primary'}`}>{filter.label}</button>)}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{[...Array(8)].map((_, index) => <div key={index} className="aspect-[0.79] animate-pulse rounded-2xl border border-border bg-surface" />)}</div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone bg-surface px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sand text-primary"><PackageSearch size={22} /></div>
          <h3 className="mt-4 font-extrabold text-textPrimary">{t('products.no_products')}</h3>
          <p className="mx-auto mt-1 max-w-xs text-sm leading-5 text-textSecondary">{t('products.no_products_desc')}</p>
          <Button className="mt-5 gap-2" onClick={() => { setProductToEdit(null); setIsAddModalOpen(true); }}><Plus size={18} /> {t('products.add_new')}</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{filteredProducts.map((product) => <ProductCard key={product.id} product={product} onEdit={setProductToEdit} onDelete={handleDeleteProduct} />)}</div>
      )}

      <AddProductModal isOpen={isAddModalOpen || Boolean(productToEdit)} onClose={() => { setIsAddModalOpen(false); setProductToEdit(null); }} onProductAdded={() => { fetchProducts(); setProductToEdit(null); }} shopId={shopId} productToEdit={productToEdit} />
    </div>
  );
};

export default Products;
