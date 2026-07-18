import { ArrowLeft, Check, EllipsisVertical, Info, Minus, PackagePlus, Plus, Send, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useRetailProfile } from '../components/providers/RetailProfileProvider';
import { calculators } from '../lib/calculators';
import type { CalculatorConfig } from '../lib/calculators';

type QuoteItem = {
  id: string;
  name: string;
  size: string;
  finish: string;
  price: number;
  quantity: number;
  areaPerPiece: number;
  thumbnail: string;
};

const catalogue: Omit<QuoteItem, 'quantity'>[] = [
  { id: 'statuario-grey', name: 'Statuario Grey', size: '600 × 1200 mm', finish: 'Polished', price: 230, areaPerPiece: 8, thumbnail: 'linear-gradient(135deg, #A7A7A3 0%, #E3E1DB 52%, #7D7D7B 100%)' },
  { id: 'crema-beige', name: 'Crema Beige', size: '600 × 1200 mm', finish: 'Matt', price: 200, areaPerPiece: 8, thumbnail: 'linear-gradient(135deg, #D6C2A0 0%, #F3E9D5 48%, #BCA786 100%)' },
  { id: 'noir-stone', name: 'Noir Stone', size: '600 × 600 mm', finish: 'Matt', price: 180, areaPerPiece: 4, thumbnail: 'linear-gradient(135deg, #39414A 0%, #777A76 48%, #1D252B 100%)' },
];

const customers = [
  { name: 'Priya Shah', project: '3BHK renovation', location: 'Mumbai', initials: 'PS' },
  { name: 'Rahul Kumar', project: 'New home flooring', location: 'Thane', initials: 'RK' },
  { name: 'Amit Mehta', project: 'Commercial project', location: 'Pune', initials: 'AM' },
];

const formatRupee = (amount: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(amount);

const QuoteBuilder = () => {
  const navigate = useNavigate();
  const { calculatorKey } = useRetailProfile();
  
  const [items, setItems] = useState<QuoteItem[]>([
    { ...catalogue[0], quantity: 40 },
    { ...catalogue[1], quantity: 30 },
  ]);
  const [customer, setCustomer] = useState(customers[0]);
  const [waste, setWaste] = useState(10);
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [isShareReady, setIsShareReady] = useState(false);

  const summary = useMemo(() => {
    const config: CalculatorConfig = { wastePercentage: waste };
    const calculator = calculators[calculatorKey] || calculators.generic;
    return calculator(items as any, config);
  }, [items, waste, calculatorKey]);

  const updateQuantity = (id: string, difference: number) => setItems((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + difference) } : item));
  const removeItem = (id: string) => setItems((current) => current.filter((item) => item.id !== id));
  const addItem = (tile: Omit<QuoteItem, 'quantity'>) => {
    setItems((current) => current.some((item) => item.id === tile.id) ? current : [...current, { ...tile, quantity: 10 }]);
    setIsProductPickerOpen(false);
  };
  const shareQuote = () => {
    setIsShareReady(true);
    window.setTimeout(() => setIsShareReady(false), 2200);
  };

  return (
    <div className="page-shell mx-auto max-w-screen-xl pb-32 pt-3 sm:pt-5">
      <header className="mb-5 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-xl text-textSecondary transition-colors hover:bg-sand hover:text-primary" aria-label="Back to dashboard"><ArrowLeft size={20} /></button>
        <div className="text-center"><p className="eyebrow">Draft quote</p><h1 className="mt-0.5 text-lg font-extrabold tracking-tight">New Quote</h1></div>
        <button className="flex h-10 w-10 items-center justify-center rounded-xl text-textSecondary transition-colors hover:bg-sand hover:text-primary" aria-label="More quote options"><EllipsisVertical size={20} /></button>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accentSoft text-xs font-extrabold text-[#9A482A]">{customer.initials}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">{customer.name}</p><p className="mt-0.5 truncate text-xs text-textSecondary">{customer.project} · {customer.location}</p></div>
          <button onClick={() => setIsCustomerPickerOpen(true)} className="rounded-xl border border-border px-3 py-2 text-xs font-extrabold text-primary transition-colors hover:bg-sand">Change</button>
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between"><div><p className="eyebrow">Quote lines</p><h2 className="mt-0.5 text-lg font-extrabold">Products</h2></div><button onClick={() => setIsProductPickerOpen(true)} className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-primaryHover"><Plus size={15} /> Add item</button></div>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          {items.length === 0 ? <div className="px-5 py-10 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-sand text-primary"><PackagePlus size={20} /></div><p className="mt-3 text-sm font-extrabold">Add your first quote item</p><button onClick={() => setIsProductPickerOpen(true)} className="mt-3 text-xs font-extrabold text-primary">Browse catalogue</button></div> : items.map((item, index) => {
            const area = item.quantity * item.areaPerPiece;
            return <div key={item.id} className={`p-3.5 ${index ? 'border-t border-border' : ''}`}>
              <div className="flex gap-3">
                <div className="h-20 w-20 shrink-0 rounded-xl border border-black/5 shadow-inner" style={{ background: item.thumbnail }} aria-label={`${item.name} tile sample`} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">{item.name}</p><p className="mt-1 text-xs text-textSecondary">{item.size}</p><p className="mt-1 text-xs text-textSecondary">{item.finish} · {formatRupee(item.price)}/sq ft</p><p className="mt-2 text-xs font-bold text-primary">{area.toFixed(2)} sq ft</p></div>
                <div className="flex w-[110px] shrink-0 flex-col rounded-xl border border-border bg-[#FCFBF9] p-2.5"><div className="flex items-center justify-between"><span className="text-[10px] font-bold text-textSecondary">Qty (pcs)</span><button onClick={() => removeItem(item.id)} className="text-textSecondary transition-colors hover:text-error" aria-label={`Remove ${item.name}`}><Trash2 size={14} /></button></div><div className="mt-1 flex items-center justify-between"><button onClick={() => updateQuantity(item.id, -1)} className="flex h-6 w-6 items-center justify-center rounded-md text-textSecondary hover:bg-sand" aria-label={`Decrease ${item.name} quantity`}><Minus size={13} /></button><span className="text-sm font-extrabold">{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)} className="flex h-6 w-6 items-center justify-center rounded-md text-primary hover:bg-sand" aria-label={`Increase ${item.name} quantity`}><Plus size={13} /></button></div><p className="mt-1 text-[10px] font-bold text-textSecondary">Area (sq ft)</p><p className="text-sm font-extrabold">{area.toFixed(2)}</p></div>
              </div>
            </div>;
          })}
        </div>
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div className="space-y-3 p-4 text-sm">
          {Object.entries(summary.breakdown).map(([label, value]) => {
            if (label === 'Wastage') {
              return (
                <div key={label} className="flex items-center justify-between border-b border-border pb-3">
                  <span className="flex items-center gap-1 font-medium text-textSecondary">Waste % <Info size={14} /></span>
                  <div className="flex items-center rounded-lg border border-border bg-[#FCFBF9]">
                    <button onClick={() => setWaste((v) => Math.max(0, v - 1))} className="flex h-8 w-8 items-center justify-center text-textSecondary hover:bg-sand" aria-label="Decrease waste"><Minus size={14} /></button>
                    <span className="w-11 text-center text-xs font-extrabold">{waste}%</span>
                    <button onClick={() => setWaste((v) => Math.min(30, v + 1))} className="flex h-8 w-8 items-center justify-center text-primary hover:bg-sand" aria-label="Increase waste"><Plus size={14} /></button>
                  </div>
                </div>
              );
            }
            return (
              <div key={label} className="flex items-center justify-between">
                <span className="font-medium text-textSecondary">{label}</span>
                <span className="font-extrabold">{typeof value === 'number' ? formatRupee(value) : value}</span>
              </div>
            );
          })}
          
          <div className="flex justify-between text-textSecondary border-t border-border pt-3"><span>Subtotal</span><span className="font-bold text-textPrimary">{formatRupee(summary.subtotal)}</span></div>
          <div className="flex justify-between text-textSecondary"><span>GST (18%)</span><span className="font-bold text-textPrimary">{formatRupee(summary.tax)}</span></div>
        </div>
        <div className="mx-3 mb-3 flex items-center justify-between rounded-xl bg-[linear-gradient(105deg,#FBE7CC,#F5D8A9)] px-4 py-3.5"><span className="text-sm font-extrabold text-textPrimary">Total amount</span><span className="text-xl font-extrabold tracking-tight text-textPrimary">{formatRupee(summary.total)}</span></div>
      </section>

      <div className="sticky bottom-20 z-10 mt-5 bg-background/95 py-3 backdrop-blur"><Button onClick={shareQuote} className="h-14 w-full gap-2 text-base">{isShareReady ? <><Check size={19} /> Quote ready to share</> : <><Send size={19} /> Share Quote</>}</Button><p className="mt-2 text-center text-[11px] text-textSecondary">A PDF and WhatsApp delivery flow will be connected next.</p></div>

      {isCustomerPickerOpen && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-primary/55 p-0 sm:items-center sm:p-4"><div className="w-full max-w-md rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl"><div className="flex items-center justify-between border-b border-border p-4"><div><p className="eyebrow">Quote for</p><h3 className="mt-0.5 text-lg font-extrabold">Choose customer</h3></div><button onClick={() => setIsCustomerPickerOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl text-textSecondary hover:bg-sand" aria-label="Close customer picker"><X size={19} /></button></div><div className="p-3">{customers.map((person) => <button key={person.name} onClick={() => { setCustomer(person); setIsCustomerPickerOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-sand ${person.name === customer.name ? 'bg-sand' : ''}`}><div className="flex h-10 w-10 items-center justify-center rounded-full bg-accentSoft text-xs font-extrabold text-[#9A482A]">{person.initials}</div><div className="min-w-0 flex-1"><p className="text-sm font-extrabold">{person.name}</p><p className="mt-0.5 text-xs text-textSecondary">{person.project} · {person.location}</p></div>{person.name === customer.name && <Check size={17} className="text-success" />}</button>)}</div></div></div>}

      {isProductPickerOpen && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-primary/55 p-0 sm:items-center sm:p-4"><div className="w-full max-w-md rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl"><div className="flex items-center justify-between border-b border-border p-4"><div><p className="eyebrow">Catalogue</p><h3 className="mt-0.5 text-lg font-extrabold">Add product</h3></div><button onClick={() => setIsProductPickerOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl text-textSecondary hover:bg-sand" aria-label="Close product picker"><X size={19} /></button></div><div className="p-3">{catalogue.map((tile) => <button key={tile.id} onClick={() => addItem(tile)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-sand"><div className="h-12 w-12 shrink-0 rounded-xl border border-black/5" style={{ background: tile.thumbnail }} /><div className="min-w-0 flex-1"><p className="text-sm font-extrabold">{tile.name}</p><p className="mt-0.5 text-xs text-textSecondary">{tile.size} · {tile.finish}</p></div><span className="text-xs font-extrabold text-primary">{items.some((item) => item.id === tile.id) ? 'Added' : 'Add'}</span></button>)}</div></div></div>}
    </div>
  );
};

export default QuoteBuilder;
