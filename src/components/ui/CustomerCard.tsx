import { CalendarDays, ChevronRight, Clock3, Edit3, IndianRupee, MapPin, MessageCircle, Phone, X } from 'lucide-react';
import { useState } from 'react';
import type { Customer, Product } from '../../types';
import { Button } from './Button';
import { ProductCard } from './ProductCard';
import { WhatsAppModal } from './WhatsAppModal';

interface CustomerCardProps {
  customer: Customer;
  onEdit?: () => void;
  shopProducts?: Product[];
  shopName?: string;
  retailerName?: string;
}

const statusStyle: Record<string, { label: string; chip: string; action: string }> = {
  new: { label: 'New lead', chip: 'bg-primary/10 text-primary', action: 'New enquiry' },
  follow_up: { label: 'Follow up', chip: 'bg-accent/10 text-accent', action: 'Follow up today' },
  converted: { label: 'Won', chip: 'bg-success/10 text-success', action: 'Converted' },
  lost: { label: 'Lost', chip: 'bg-textSecondary/10 text-textSecondary', action: 'Closed' },
  quoted: { label: 'Quoted', chip: 'bg-warning/10 text-warning', action: 'Quote sent' },
  won: { label: 'Won', chip: 'bg-success/10 text-success', action: 'Converted' },
};

const formatRupee = (value: number | null) => value == null
  ? 'Budget not set'
  : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

export function CustomerCard({ customer, onEdit, shopProducts = [], shopName = 'Your Tile Shop', retailerName = '' }: CustomerCardProps) {
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const style = statusStyle[customer.visit_status] || statusStyle.new;

  const formatDate = (date: string) => new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));

  const productEntries = customer.required_products?.split(',').map((entry) => {
    const match = entry.trim().match(/^(.*?)(?:\s*\(x(\d+)\))?$/);
    const name = match?.[1].trim() || entry.trim();
    const quantity = match?.[2] ? Number.parseInt(match[2], 10) : 1;
    return { name, quantity, product: shopProducts.find((item) => item.name.toLowerCase() === name.toLowerCase()) };
  }) || [];

  return (
    <>
      <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-start gap-3 p-4 pb-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sand text-xs font-extrabold text-primary">
            {customer.name.split(' ').slice(0, 2).map((word) => word[0]).join('').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-extrabold tracking-tight text-textPrimary">{customer.name}</h3>
                <p className="mt-0.5 truncate text-xs font-medium text-textSecondary">{customer.project_type || 'General tile enquiry'}{customer.location ? ` · ${customer.location}` : ''}</p>
              </div>
              {onEdit && (
                <button onClick={onEdit} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-textSecondary transition-colors hover:bg-sand hover:text-primary" aria-label={`Edit ${customer.name}`}>
                  <Edit3 size={17} />
                </button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${style.chip}`}>{style.label}</span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-textSecondary"><CalendarDays size={12} /> Added {formatDate(customer.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="mx-4 flex items-center justify-between rounded-xl bg-background px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <Clock3 size={15} className="shrink-0 text-accent" />
            <span className="truncate text-xs font-bold text-textPrimary">{style.action}</span>
          </div>
          <ChevronRight size={16} className="shrink-0 text-stone" />
        </div>

        <div className="grid grid-cols-2 gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-textSecondary"><IndianRupee size={14} className="shrink-0 text-textSecondary" /><span className="truncate font-semibold">{formatRupee(customer.budget)}</span></div>
          <div className="flex min-w-0 items-center justify-end gap-1.5 text-xs text-textSecondary"><MapPin size={14} className="shrink-0" /><span className="truncate">{customer.location || 'Location not set'}</span></div>
        </div>

        {productEntries.length > 0 && (
          <div className="border-t border-border px-4 py-3">
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.13em] text-textSecondary">Interested in</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {productEntries.map(({ name, quantity, product }, index) => product ? (
                <button key={`${product.id}-${index}`} onClick={() => setSelectedProduct(product)} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-sand text-left focus-visible:outline-2 focus-visible:outline-primary" title={product.name}>
                  {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center px-1 text-center text-[9px] font-semibold text-textSecondary">{product.name}</span>}
                  {quantity > 1 && <span className="absolute right-1 top-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-extrabold text-white">×{quantity}</span>}
                </button>
              ) : (
                <span key={`${name}-${index}`} className="flex h-14 shrink-0 items-center rounded-xl border border-border bg-sand px-3 text-xs font-semibold text-textSecondary">{name}{quantity > 1 ? ` ×${quantity}` : ''}</span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 border-t border-border p-3">
          <Button variant="secondary" className="h-11 flex-1 gap-2" disabled={!customer.phone} onClick={() => window.open(`tel:${customer.phone}`)}>
            <Phone size={16} /> Call
          </Button>
          <Button variant="outline" className="h-11 flex-1 gap-2 border-success/30 text-success hover:bg-success/10" disabled={!customer.phone} onClick={() => setIsWhatsAppOpen(true)}>
            <MessageCircle size={16} /> WhatsApp
          </Button>
        </div>
      </article>

      {isWhatsAppOpen && <WhatsAppModal customer={customer} shopName={shopName} retailerName={retailerName} onClose={() => setIsWhatsAppOpen(false)} />}

      {selectedProduct && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-primary/70 p-4" role="dialog" aria-modal="true" aria-label="Product details">
          <div className="relative w-full max-w-sm">
            <button onClick={() => setSelectedProduct(null)} className="absolute -top-12 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition-colors hover:bg-white/30" aria-label="Close product details"><X size={20} /></button>
            <ProductCard product={selectedProduct} />
          </div>
        </div>
      )}
    </>
  );
}
