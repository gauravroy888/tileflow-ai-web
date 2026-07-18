import { Edit3, MoreHorizontal, Trash2 } from 'lucide-react';
import type { Product } from '../../types';
import { useTranslation } from 'react-i18next';
import { useRetailProfile } from '../providers/RetailProfileProvider';

interface ProductCardProps {
  product: Product;
  onFavorite?: (id: string) => void;
  onEdit?: (product: Product) => void;
  onDelete?: (id: string) => void;
}

const formatRupee = (value: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(value);

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const { t } = useTranslation();
  const { productFieldSchema } = useRetailProfile();

  let attributes = productFieldSchema
    .map(field => {
      const val = (product as any)[field.key] || (product.attributes && product.attributes[field.key]);
      return val ? `${field.label}: ${val}` : null;
    })
    .filter(Boolean)
    .slice(0, 3);

  if (attributes.length === 0) {
    attributes = [product.size, product.finish, product.color, product.material, product.sku].filter(Boolean).slice(0, 3);
  }
  const stock = product.stock_status === 'in_stock'
    ? { label: t('products.in_stock'), className: 'bg-[#D9ECE4] text-[#177B63]' }
    : product.stock_status === 'low_stock'
      ? { label: 'Low stock', className: 'bg-[#F8ECD5] text-[#9C5A10]' }
      : product.stock_status === 'discontinued'
        ? { label: 'Discontinued', className: 'bg-[#EFECE8] text-[#67727E]' }
        : { label: t('products.out_of_stock'), className: 'bg-[#FBE1E1] text-[#A43535]' };

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[1.05] overflow-hidden bg-sand">
        {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" /> : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[linear-gradient(135deg,#EAE5DC,#D8D0C4)] text-center text-textSecondary"><div className="h-10 w-10 rounded-xl border border-white/60 bg-white/40" /><span className="text-[10px] font-bold">Add product photo</span></div>
        )}
        <span className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-extrabold shadow-sm ${stock.className}`}>{stock.label}</span>
        {(onEdit || onDelete) && <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          {onEdit && <button onClick={() => onEdit(product)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-primary shadow-sm backdrop-blur transition-colors hover:bg-white" aria-label={`Edit ${product.name}`}><Edit3 size={15} /></button>}
          {onDelete && <button onClick={() => { if (window.confirm(`Delete ${product.name}?`)) onDelete(product.id); }} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-error shadow-sm backdrop-blur transition-colors hover:bg-white" aria-label={`Delete ${product.name}`}><Trash2 size={15} /></button>}
        </div>}
      </div>
      <div className="p-3.5">
        <p className="truncate text-[10px] font-extrabold uppercase tracking-[0.13em] text-textSecondary">{product.brand || 'Unbranded'} · {product.category || 'Tiles'}</p>
        <h3 className="mt-1 truncate text-sm font-extrabold tracking-tight text-textPrimary">{product.name}</h3>
        <p className="mt-1.5 min-h-8 text-[11px] leading-4 text-textSecondary">{attributes.length ? attributes.join(' · ') : 'Add size, finish or SKU'}</p>
        <div className="mt-3 flex items-end justify-between border-t border-border pt-3">
          <div><p className="text-[10px] font-bold uppercase tracking-wide text-textSecondary">{t('products.price_sqft')}</p><p className="mt-0.5 text-base font-extrabold tracking-tight text-primary">{formatRupee(product.price)}</p></div>
          <MoreHorizontal size={18} className="text-stone" />
        </div>
      </div>
    </article>
  );
}
