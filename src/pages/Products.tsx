import { useMemo, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PackageSearch, Plus, Search, SlidersHorizontal, Download, Upload, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import { exportProductsToCSV, importProductsFromCSV } from '../lib/csvHelper';
import { toast } from 'react-hot-toast';
import { ProductCard } from '../components/ui/ProductCard';
import { Button } from '../components/ui/Button';
import { useRetailProfile } from '../components/providers/RetailProfileProvider';
import { useTranslation } from 'react-i18next';
import { AddProductModal } from '../components/products/AddProductModal';
import { ProductDetailsModal } from '../components/products/ProductDetailsModal';
import { CsvImportTutorialModal } from '../components/products/CsvImportTutorialModal';


type ProductFilter = 'all' | 'low_stock' | string;

const Products = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { userProfile, labels } = useRetailProfile();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ProductFilter>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: productsData = [], isLoading: loading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');
      
      const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', session.user.id).single();
      if (profile) setShopId(profile.shop_id);
      if (!profile?.shop_id) throw new Error('Shop not found');
      
      // HIGH-03: Always explicitly filter by shop_id as defense-in-depth (don't rely solely on RLS)
      const { data, error } = await supabase.from('products').select('*')
        .eq('shop_id', profile.shop_id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data || [];
    }
  });
  
  // Keep local products state for filtering or use data directly
  const products = productsData;

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').update({ is_archived: true }).eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product: ' + error.message);
    }
  });

  const handleDeleteProduct = (id: string) => {
    // MED-07: Add confirmation guard before archiving product
    if (window.confirm(`Are you sure you want to delete this ${labels.productSingular?.toLowerCase() || 'product'}?`)) {
      deleteProductMutation.mutate(id);
    }
  };

  const filters = useMemo(() => {
    const categories = [...new Set(products.map((product) => product.category).filter(Boolean))].slice(0, 3) as string[];
    return [
      { id: 'all', label: labels.productPlural ? `All ${labels.productPlural}` : t('products.all_items') },
      { id: 'low_stock', label: t('products.low_stock') },
      ...categories.map((category) => ({ id: category, label: category })),
    ];
  }, [products, t, labels]);

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
          <p className="eyebrow">{labels.productPlural ? `${labels.productPlural} Workspace` : t('products.workspace')}</p>
          <h2 className="mt-0.5 text-2xl font-extrabold tracking-tight text-textPrimary">{labels.productsTitle || t('products.title')}</h2>
          <p className="mt-1 text-sm text-textSecondary">{products.length} {labels.productPlural ? `in ${labels.productPlural.toLowerCase()} catalogue` : t('products.in_catalogue')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => exportProductsToCSV(products)}>
            <Download size={18} /> Export CSV
          </Button>
          <Button variant="outline" size="sm" className="shrink-0 gap-1.5" disabled={isImporting} onClick={() => setIsTutorialModalOpen(true)}>
            {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />} Import CSV
          </Button>
          <input type="file" accept=".csv, .zip" className="hidden" ref={fileInputRef} onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file || !shopId) return;
            setIsImporting(true);
            try {
              const count = await importProductsFromCSV(file, shopId);
              toast.success(`Imported ${count} ${labels.productPlural?.toLowerCase() || 'products'} successfully!`);
              queryClient.invalidateQueries({ queryKey: ['products'] });
            } catch (err: any) {
              toast.error('Import failed: ' + err.message);
            } finally {
              setIsImporting(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }
          }} />
          <Button size="sm" className="shrink-0 gap-1.5" onClick={() => { setProductToEdit(null); setIsAddModalOpen(true); }}>
            <Plus size={18} /> {labels.productAdd || t('products.add_new')}
          </Button>
        </div>
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{filteredProducts.map((product) => <ProductCard key={product.id} product={product} onClick={setSelectedProductForDetails} onEdit={setProductToEdit} onDelete={(userProfile?.role === 'owner' || userProfile?.has_full_access) ? handleDeleteProduct : undefined} />)}</div>
      )}

      <AddProductModal isOpen={isAddModalOpen || Boolean(productToEdit)} onClose={() => { setIsAddModalOpen(false); setProductToEdit(null); }} onProductAdded={() => { queryClient.invalidateQueries({ queryKey: ['products'] }); setProductToEdit(null); }} shopId={shopId} productToEdit={productToEdit} />
      <ProductDetailsModal isOpen={Boolean(selectedProductForDetails)} product={selectedProductForDetails} onClose={() => setSelectedProductForDetails(null)} />
      <CsvImportTutorialModal 
        isOpen={isTutorialModalOpen} 
        onClose={() => setIsTutorialModalOpen(false)} 
        onProceed={() => {
          setIsTutorialModalOpen(false);
          fileInputRef.current?.click();
        }}
        onDownloadTemplate={() => exportProductsToCSV([])}
      />
    </div>
  );
};

export default Products;
