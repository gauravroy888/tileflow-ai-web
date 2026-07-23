import { ArrowLeft, Check, Info, Minus, PackagePlus, Plus, Search, Send, Trash2, X, Loader2, UploadCloud, Image as ImageIcon, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useRetailProfile } from '../components/providers/RetailProfileProvider';
import { calculators } from '../lib/calculators';
import type { CalculatorConfig } from '../lib/calculators';
import { supabase } from '../lib/supabase';
import type { Customer, Product } from '../types';
import { generateQuotePDF } from '../lib/pdfGenerator';
import { uploadToR2 } from '../lib/r2Storage';

type QuoteItem = Product & {
  quantity: number;
};

const formatRupee = (amount: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(amount);

const QuoteBuilder = () => {
  const navigate = useNavigate();
  const { shop, calculatorKey } = useRetailProfile();
  
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [waste, setWaste] = useState(10);
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false);
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [taxRate, setTaxRate] = useState<number>(18);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  useEffect(() => {
    if (shop?.settings?.qrCodeUrl && !qrCodeUrl) {
      setQrCodeUrl(shop.settings.qrCodeUrl);
    }
  }, [shop?.settings?.qrCodeUrl, qrCodeUrl]);

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingQr(true);
    try {
      const url = await uploadToR2(file, 'qrcodes');
      setQrCodeUrl(url);
      toast.success('QR Code uploaded successfully');
    } catch (err) {
      toast.error('Failed to upload QR Code');
    } finally {
      setIsUploadingQr(false);
    }
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAttachment(true);
    try {
      const url = await uploadToR2(file, 'attachments');
      setAttachmentUrl(url);
      toast.success('Attachment uploaded successfully');
    } catch (err) {
      toast.error('Failed to upload attachment');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', session.user.id).single();
        if (!profile) return;
        
        const [productsRes, customersRes] = await Promise.all([
          supabase.from('products').select('*').eq('shop_id', profile.shop_id).eq('is_archived', false).limit(1000),
          supabase.from('customers').select('*').eq('shop_id', profile.shop_id).eq('is_archived', false).order('created_at', { ascending: false }).limit(1000)
        ]);
        
        if (productsRes.data) setProducts(productsRes.data);
        if (customersRes.data) {
          setCustomers(customersRes.data);
          if (customersRes.data.length > 0) setCustomer(customersRes.data[0]);
        }
      } catch (err) {
        console.error('Error fetching data', err);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  const summary = useMemo(() => {
    const config: CalculatorConfig = { wastePercentage: waste };
    const calculator = calculators[calculatorKey] || calculators.generic;
    // Map our DB QuoteItem to what the calculators expect
    const calcItems = items.map(item => ({
      ...item,
      areaPerPiece: item.attributes?.areaPerPiece || 1
    }));
    const baseSummary = calculator(calcItems as any, config);
    
    // Recalculate tax based on custom taxRate
    const tax = Math.round((baseSummary.subtotal * taxRate) / 100);
    const total = baseSummary.subtotal + tax;

    return {
      ...baseSummary,
      taxRate,
      tax,
      total
    };
  }, [items, waste, calculatorKey, taxRate]);

  const updateQuantity = (id: string, difference: number) => setItems((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + difference) } : item));
  const removeItem = (id: string) => setItems((current) => current.filter((item) => item.id !== id));
  const addItem = (product: Product) => {
    setItems((current) => current.some((item) => item.id === product.id) ? current : [...current, { ...product, quantity: 10 }]);
    setIsProductPickerOpen(false);
  };
  
  const shareQuote = async () => {
    if (!customer) { toast.error('Please select a customer first.'); return; }
    if (items.length === 0) { toast.error('Please add at least one product.'); return; }

    try {
      setIsSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', session?.user?.id).single();
      if (!profile) throw new Error('No profile');

      // Insert Quote
      const { data: quote, error: quoteError } = await supabase.from('quotes').insert({
        shop_id: profile.shop_id,
        customer_id: customer.id,
        subtotal: summary.subtotal,
        tax: summary.tax,
        total_amount: summary.total,
        status: 'draft'
      }).select().single();

      if (quoteError) throw quoteError;

      // Insert Quote Items
      const quoteItems = items.map(item => ({
        quote_id: quote.id,
        product_id: item.id,
        quantity: item.quantity,
        price_at_time: item.price
      }));

      const { error: itemsError } = await supabase.from('quote_items').insert(quoteItems);
      if (itemsError) throw itemsError;

      // 1. Generate PDF Blob
      const pdfBlob = await generateQuotePDF({
        shopName: shop?.name || 'RetailFlow Shop',
        logoUrl: shop?.settings?.logoUrl || null,
        qrCodeUrl: qrCodeUrl,
        attachmentUrl: attachmentUrl,
        customer,
        items,
        summary: { ...summary, taxRate },
        quoteId: quote.id
      });

      // 2. Upload to Cloudflare R2
      const fileName = `${quote.id}-${Date.now()}.pdf`;
      const publicUrl = await uploadToR2(pdfBlob, fileName);

      // 4. Open WhatsApp
      const message = `Hi ${customer.name},\n\nHere is the quotation you requested from ${shop?.name || 'our shop'}. You can view or download the PDF using the link below:\n\n${publicUrl}\n\nThank you for your business!`;
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');

      // Reset state so the same quote cannot be re-submitted
      setItems([]);
      setCustomer(customers[0] ?? null);
      toast.success('Quote saved & shared successfully!');

    } catch (err: any) {
      console.error('Failed to save quote:', err);
      if (err.message?.includes('RATE_LIMIT_QUOTES')) {
        toast.error('Daily limit reached: max 100 quotes per day.');
      } else {
        toast.error('Failed to save quote: ' + err.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="page-shell mx-auto max-w-screen-xl pb-32 pt-3 sm:pt-5">
      <header className="mb-5 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-xl text-textSecondary transition-colors hover:bg-sand hover:text-primary" aria-label="Back to dashboard"><ArrowLeft size={20} /></button>
        <div className="text-center"><p className="eyebrow">Draft quote</p><h1 className="mt-0.5 text-lg font-extrabold tracking-tight">New Quote</h1></div>
        <div className="h-10 w-10" />
      </header>

      <section className="rounded-2xl border border-border bg-surface p-3.5 shadow-sm">
        {customer ? (
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accentSoft text-xs font-extrabold text-[#9A482A]">{customer.name.substring(0,2).toUpperCase()}</div>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">{customer.name}</p><p className="mt-0.5 truncate text-xs text-textSecondary">{customer.project_type || 'General'} · {customer.location || 'Unknown'}</p></div>
            <button onClick={() => setIsCustomerPickerOpen(true)} className="rounded-xl border border-border px-3 py-2 text-xs font-extrabold text-primary transition-colors hover:bg-sand">Change</button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-textSecondary">No customer selected</span>
            <button onClick={() => setIsCustomerPickerOpen(true)} className="rounded-xl border border-border px-3 py-2 text-xs font-extrabold text-primary transition-colors hover:bg-sand">Select</button>
          </div>
        )}
      </section>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between"><div><p className="eyebrow">Quote lines</p><h2 className="mt-0.5 text-lg font-extrabold">Products</h2></div><button onClick={() => setIsProductPickerOpen(true)} className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-primaryHover"><Plus size={15} /> Add item</button></div>
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          {items.length === 0 ? <div className="px-5 py-10 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-sand text-primary"><PackagePlus size={20} /></div><p className="mt-3 text-sm font-extrabold">Add your first quote item</p><button onClick={() => setIsProductPickerOpen(true)} className="mt-3 text-xs font-extrabold text-primary">Browse catalogue</button></div> : items.map((item, index) => {
            const areaPerPiece = item.attributes?.areaPerPiece || 1;
            const area = item.quantity * areaPerPiece;
            const bgThumbnail = item.image_url ? `url(${item.image_url})` : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
            return <div key={item.id} className={`p-3.5 ${index ? 'border-t border-border' : ''}`}>
              <div className="flex gap-3">
                <div className="h-20 w-20 shrink-0 rounded-xl border border-black/5 shadow-inner bg-cover bg-center" style={{ backgroundImage: bgThumbnail }} aria-label={`${item.name} sample`} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold">{item.name}</p><p className="mt-1 text-xs text-textSecondary">{item.size || 'Standard Size'}</p><p className="mt-1 text-xs text-textSecondary">{item.finish || 'Standard'} · {formatRupee(item.price)}</p>{calculatorKey === 'area_wastage' && <p className="mt-2 text-xs font-bold text-primary">{area.toFixed(2)} sq ft</p>}</div>
                <div className="flex w-[110px] shrink-0 flex-col rounded-xl border border-border bg-[#FCFBF9] p-2.5"><div className="flex items-center justify-between"><span className="text-[10px] font-bold text-textSecondary">Qty (pcs)</span><button onClick={() => removeItem(item.id)} className="text-textSecondary transition-colors hover:text-error" aria-label={`Remove ${item.name}`}><Trash2 size={14} /></button></div><div className="mt-1 flex items-center justify-between"><button onClick={() => updateQuantity(item.id, -1)} className="flex h-6 w-6 items-center justify-center rounded-md text-textSecondary hover:bg-sand" aria-label={`Decrease ${item.name} quantity`}><Minus size={13} /></button><span className="text-sm font-extrabold">{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)} className="flex h-6 w-6 items-center justify-center rounded-md text-primary hover:bg-sand" aria-label={`Increase ${item.name} quantity`}><Plus size={13} /></button></div>{calculatorKey === 'area_wastage' && <><p className="mt-1 text-[10px] font-bold text-textSecondary">Area (sq ft)</p><p className="text-sm font-extrabold">{area.toFixed(2)}</p></>}</div>
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
          <div className="flex items-center justify-between text-textSecondary">
            <div className="flex items-center gap-2">
              <span>GST</span>
              <select 
                value={taxRate} 
                onChange={(e) => setTaxRate(Number(e.target.value))} 
                className="rounded-lg border border-border bg-[#FCFBF9] px-2 py-1 text-xs font-medium text-textPrimary focus:border-primary focus:outline-none"
              >
                <option value={0}>0%</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18%</option>
                <option value={28}>28%</option>
              </select>
            </div>
            <span className="font-bold text-textPrimary">{formatRupee(summary.tax)}</span>
          </div>
        </div>
        <div className="mx-3 mb-3 flex items-center justify-between rounded-xl bg-[linear-gradient(105deg,#FBE7CC,#F5D8A9)] px-4 py-3.5"><span className="text-sm font-extrabold text-textPrimary">Total amount</span><span className="text-xl font-extrabold tracking-tight text-textPrimary">{formatRupee(summary.total)}</span></div>
      </section>

      <section className="mt-5 space-y-3">
        <label className={`flex w-full cursor-pointer items-center justify-between rounded-xl border border-dashed p-4 transition-colors ${qrCodeUrl ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:bg-sand'}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FCFBF9] text-textSecondary">
              {isUploadingQr ? <Loader2 className="animate-spin" size={20} /> : <QrCode size={20} />}
            </div>
            <div>
              <p className="font-medium text-sm text-textPrimary">{qrCodeUrl ? 'QR Code Added' : 'Add Payment QR Code'}</p>
              <p className="text-xs text-textSecondary">Shown on PDF bottom</p>
            </div>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleQrUpload} disabled={isUploadingQr} />
          {qrCodeUrl ? <Check className="text-primary" size={20} /> : <UploadCloud className="text-textSecondary" size={20} />}
        </label>

        <label className={`flex w-full cursor-pointer items-center justify-between rounded-xl border border-dashed p-4 transition-colors ${attachmentUrl ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:bg-sand'}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FCFBF9] text-textSecondary">
              {isUploadingAttachment ? <Loader2 className="animate-spin" size={20} /> : <ImageIcon size={20} />}
            </div>
            <div>
              <p className="font-medium text-sm text-textPrimary">{attachmentUrl ? 'Attachment Added' : 'Add Product Image'}</p>
              <p className="text-xs text-textSecondary">Optional PDF reference</p>
            </div>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleAttachmentUpload} disabled={isUploadingAttachment} />
          {attachmentUrl ? <Check className="text-primary" size={20} /> : <UploadCloud className="text-textSecondary" size={20} />}
        </label>
      </section>

      <div className="sticky bottom-20 z-10 mt-5 bg-background/95 py-3 backdrop-blur">
        <Button disabled={isSaving || !customer || items.length === 0} onClick={shareQuote} className="h-14 w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1DA851] text-white text-base">
          {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          {isSaving ? 'Generating PDF...' : 'Share via WhatsApp'}
        </Button>
      </div>

      {isCustomerPickerOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-primary/55 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-md rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-border p-4 shrink-0">
              <div>
                <p className="eyebrow">Quote for</p>
                <h3 className="mt-0.5 text-lg font-extrabold">Choose customer</h3>
              </div>
              <button onClick={() => setIsCustomerPickerOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl text-textSecondary hover:bg-sand" aria-label="Close customer picker">
                <X size={19} />
              </button>
            </div>
            <div className="border-b border-border p-3 shrink-0">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" />
                <input 
                  type="text" 
                  placeholder="Search customers..." 
                  value={customerSearchQuery} 
                  onChange={(e) => setCustomerSearchQuery(e.target.value)} 
                  className="w-full rounded-xl border border-border bg-[#FCFBF9] py-2.5 pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
                />
              </div>
            </div>
            <div className="p-3 overflow-y-auto">
              {customers.filter(c => c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) || c.phone?.includes(customerSearchQuery)).length === 0 ? (
                <p className="text-center text-sm text-textSecondary py-4">
                  {customers.length === 0 ? 'No customers found. Create one first.' : 'No customers match your search.'}
                </p>
              ) : (
                customers.filter(c => c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) || c.phone?.includes(customerSearchQuery)).map((person) => (
                  <button key={person.id} onClick={() => { setCustomer(person); setIsCustomerPickerOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-sand ${person.id === customer?.id ? 'bg-sand' : ''}`}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accentSoft text-xs font-extrabold text-[#9A482A]">
                      {person.name.substring(0,2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold truncate">{person.name}</p>
                      <p className="mt-0.5 text-xs text-textSecondary truncate">{person.project_type || 'General'} · {person.location || 'Unknown'}</p>
                    </div>
                    {person.id === customer?.id && <Check size={17} className="text-success shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {isProductPickerOpen && <div className="fixed inset-0 z-[100] flex items-end justify-center bg-primary/55 p-0 sm:items-center sm:p-4"><div className="w-full max-w-md rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-border p-4 shrink-0"><div><p className="eyebrow">Catalogue</p><h3 className="mt-0.5 text-lg font-extrabold">Add product</h3></div><button onClick={() => setIsProductPickerOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl text-textSecondary hover:bg-sand" aria-label="Close product picker"><X size={19} /></button></div>
        <div className="border-b border-border p-3 shrink-0"><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary" /><input type="text" placeholder="Search products..." value={productSearchQuery} onChange={(e) => setProductSearchQuery(e.target.value)} className="w-full rounded-xl border border-border bg-[#FCFBF9] py-2.5 pl-9 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" /></div></div>
        <div className="p-3 overflow-y-auto">{products.filter(p => p.name.toLowerCase().includes(productSearchQuery.toLowerCase())).length === 0 ? <p className="text-center text-sm text-textSecondary py-4">{products.length === 0 ? 'No products found. Add products to your catalogue first.' : 'No products match your search.'}</p> : products.filter(p => p.name.toLowerCase().includes(productSearchQuery.toLowerCase())).map((tile) => {
        const bgThumbnail = tile.image_url ? `url(${tile.image_url})` : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
        return <button key={tile.id} onClick={() => addItem(tile)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-sand"><div className="h-12 w-12 shrink-0 rounded-xl border border-black/5 bg-cover bg-center" style={{ backgroundImage: bgThumbnail }} /><div className="min-w-0 flex-1"><p className="text-sm font-extrabold">{tile.name}</p><p className="mt-0.5 text-xs text-textSecondary">{tile.size || 'Standard'} · {tile.finish || 'Standard'}</p></div><span className="text-xs font-extrabold text-primary">{items.some((item) => item.id === tile.id) ? 'Added' : 'Add'}</span></button>
      })}</div></div></div>}
    </div>
  );
};

export default QuoteBuilder;
