import { useEffect, useState } from 'react';
import { Search, Filter, UserPlus, X, Plus, Check, Minus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Customer, Product } from '../types';
import { CustomerCard } from '../components/ui/CustomerCard';
import { Button } from '../components/ui/Button';
import { useTranslation } from 'react-i18next';

const PROJECT_TYPES = ['Residential', 'Commercial', 'Office', 'Hotel', 'Retail', 'Other'];
const VISIT_STATUSES = ['new', 'follow_up', 'converted', 'lost'];

const Customers = () => {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  
  // Product picker state
  const [shopProducts, setShopProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<{product: Product, quantity: number}[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    budget: '',
    location: '',
    project_type: '',
    visit_status: 'new',
    notes: '',
    required_products: '',
  });

  const [retailerName, setRetailerName] = useState<string>('');
  const [shopName, setShopName] = useState<string>('Your Tile Shop');

  useEffect(() => {
    fetchCustomers();
    fetchShopProducts();
    fetchShopDetails();
  }, []);

  const fetchShopDetails = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select(`
          full_name,
          shops ( name )
        `)
        .eq('id', session.user.id)
        .single();
        
      if (profile) {
        setRetailerName(profile.full_name || '');
        // @ts-ignore - Supabase type inference for joins can be strict
        if (profile.shops && profile.shops.name) {
          // @ts-ignore
          setShopName(profile.shops.name);
        }
      }
    } catch (e) {
      console.error('Error fetching shop details:', e);
    }
  };

  const generateCustomerDraft = async (customerData: any, customerId: string, shop: string, retailer: string) => {
    try {
      const prompt = `Write a short, professional, and friendly WhatsApp follow-up message to a retail customer from the shop "${shop}". The message is from "${retailer}".
Customer Name: ${customerData.name}
Project Type: ${customerData.project_type || 'General Inquiry'}
Required Products: ${customerData.required_products || 'Not specified'}

Rules:
- Keep it under 4 sentences.
- Be conversational and polite.
- Sign off with the retailer's name and shop name.`;
        
      const { data, error } = await supabase.functions.invoke('gemini-proxy', {
        body: { action: 'chat', prompt, history: [] }
      });

      if (!error && data?.text) {
        await supabase.from('customers').update({ ai_draft_message: data.text.trim() }).eq('id', customerId);
        // Silently refresh customers list in the background to show the new draft if user opens it
        fetchCustomers();
      }
    } catch (err) {
      console.error('Background AI Draft failed:', err);
    }
  };

  const fetchShopProducts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data: profile } = await supabase.from('profiles').select('shop_id').eq('id', session.user.id).single();
      if (!profile?.shop_id) return;
      
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', profile.shop_id)
        .order('created_at', { ascending: false });
        
      if (products) setShopProducts(products as Product[]);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setEditingCustomerId(null);
    setSelectedProducts([]);
    setForm({ name: '', phone: '', budget: '', location: '', project_type: '', visit_status: 'new', notes: '', required_products: '' });
    setIsModalOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomerId(customer.id);
    
    // Restore selected products
    if (customer.required_products) {
      const productEntries = customer.required_products.split(',').map(n => n.trim());
      const matched = productEntries.map(entry => {
        const match = entry.match(/^(.*?)(?:\s*\(x(\d+)\))?$/);
        const name = match ? match[1].trim() : entry;
        const quantity = match && match[2] ? parseInt(match[2], 10) : 1;
        
        const found = shopProducts.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (found) return { product: found, quantity };
        return { product: { id: `custom-${name}`, name, shop_id: '', category: '', price: 0, image_url: null, created_at: '' } as Product, quantity };
      });
      setSelectedProducts(matched);
    } else {
      setSelectedProducts([]);
    }

    setForm({
      name: customer.name,
      phone: customer.phone || '',
      budget: customer.budget?.toString() || '',
      location: customer.location || '',
      project_type: customer.project_type || '',
      visit_status: customer.visit_status,
      notes: customer.notes || '',
      required_products: '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not logged in');

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', session.user.id)
        .single();

      if (!profile?.shop_id) throw new Error('No shop found');

      const customerData = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        budget: form.budget ? parseFloat(form.budget) : null,
        location: form.location.trim() || null,
        project_type: form.project_type || null,
        visit_status: form.visit_status,
        notes: form.notes.trim() || null,
        required_products: selectedProducts.length > 0 ? selectedProducts.map(sp => `${sp.product.name}${sp.quantity > 1 ? ` (x${sp.quantity})` : ''}`).join(', ') : null,
      };

      if (editingCustomerId) {
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', editingCustomerId);
        if (error) throw error;
      } else {
        const { data: newCustomer, error } = await supabase.from('customers').insert({
          ...customerData,
          shop_id: profile.shop_id,
          assigned_to: null,
        }).select().single();
        if (error) throw error;
        
        // Background task
        if (newCustomer) {
          generateCustomerDraft(customerData, newCustomer.id, shopName, retailerName);
        }
      }

      setIsModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      console.error(err);
      alert('Failed to add customer: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(searchQuery))
  );

  return (
    <div className="p-4 space-y-4">
      {/* Header & Actions */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold text-textPrimary">{t('customers.title')}</h2>
        <Button size="sm" className="gap-1" onClick={handleOpenModal}>
          <UserPlus size={16} /> {t('customers.add_new')}
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={t('customers.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[48px]"
          />
        </div>
        <Button variant="outline" size="icon" aria-label="Filters">
          <Filter size={20} />
        </Button>
      </div>

      {/* Customers List */}
      {loading ? (
        <div className="space-y-3 mt-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-surface rounded-xl h-32 border border-border" />
          ))}
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-textSecondary">{t('customers.no_customers')}</p>
        </div>
      ) : (
        <div className="space-y-3 mt-4">
          {filteredCustomers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} onEdit={() => handleEditCustomer(customer)} shopProducts={shopProducts} shopName={shopName} retailerName={retailerName} />
          ))}
        </div>
      )}

      {/* Add Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-surface w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <h3 className="font-bold text-lg text-textPrimary">{editingCustomerId ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-textPrimary mb-1">Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2.5 bg-background text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-textPrimary mb-1">Phone</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2.5 bg-background text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>

              {/* Budget & Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-textPrimary mb-1">Budget (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 50000"
                    value={form.budget}
                    onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                    className="w-full border border-border rounded-xl px-3 py-2.5 bg-background text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-textPrimary mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    className="w-full border border-border rounded-xl px-3 py-2.5 bg-background text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>

              {/* Project Type & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-textPrimary mb-1">Project Type</label>
                  <select
                    value={form.project_type}
                    onChange={e => setForm(f => ({ ...f, project_type: e.target.value }))}
                    className="w-full border border-border rounded-xl px-3 py-2.5 bg-background text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    <option value="">Select...</option>
                    {PROJECT_TYPES.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-textPrimary mb-1">Status</label>
                  <select
                    value={form.visit_status}
                    onChange={e => setForm(f => ({ ...f, visit_status: e.target.value }))}
                    className="w-full border border-border rounded-xl px-3 py-2.5 bg-background text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    {VISIT_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>

              {/* Products Required Picker */}
              <div>
                <label className="block text-sm font-medium text-textPrimary mb-2">Products Required</label>
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {selectedProducts.map(sp => (
                    <div key={sp.product.id} className="relative w-20 shrink-0 flex flex-col gap-2">
                      <div className="relative w-20 h-20 rounded-xl bg-gray-100 border border-border">
                         {sp.product.image_url ? (
                            <img src={sp.product.image_url} alt={sp.product.name} className="w-full h-full object-cover rounded-xl" />
                         ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 p-1 text-center truncate">{sp.product.name}</div>
                         )}
                         <button onClick={() => setSelectedProducts(prev => prev.filter(p => p.product.id !== sp.product.id))} className="absolute -top-2 -right-2 bg-black text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-500 shadow-md z-10">
                           <X size={14} />
                         </button>
                      </div>
                      
                      <div className="flex items-center justify-between bg-surface border border-border rounded-lg overflow-hidden">
                        <button 
                          onClick={() => setSelectedProducts(prev => prev.map(p => p.product.id === sp.product.id ? { ...p, quantity: Math.max(1, p.quantity - 1) } : p))}
                          className="p-1 hover:bg-gray-100 text-gray-600 transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-medium">{sp.quantity}</span>
                        <button 
                          onClick={() => setSelectedProducts(prev => prev.map(p => p.product.id === sp.product.id ? { ...p, quantity: p.quantity + 1 } : p))}
                          className="p-1 hover:bg-gray-100 text-gray-600 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => setIsPickerOpen(true)} className="flex flex-col items-center justify-center px-4 py-2 h-20 bg-surface border-2 border-dashed border-border rounded-xl text-textSecondary font-medium hover:bg-gray-50 hover:border-primary hover:text-primary transition-colors shrink-0 mb-8">
                    <Plus size={20} className="mb-1" />
                    <span className="text-[10px] whitespace-nowrap">Add from</span>
                    <span className="text-[10px] whitespace-nowrap">Inventory</span>
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-textPrimary mb-1">Notes</label>
                <textarea
                  placeholder="Any additional notes..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full border border-border rounded-xl px-3 py-2.5 bg-background text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex gap-3 shrink-0">
              <Button variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? 'Saving...' : (editingCustomerId ? 'Save Changes' : 'Add Customer')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Product Picker Modal */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface w-full max-w-2xl rounded-2xl shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <h3 className="font-bold text-lg">Select Products</h3>
              <button onClick={() => setIsPickerOpen(false)} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {shopProducts.length === 0 ? (
                <div className="text-center text-textSecondary py-8">No products found in your inventory.</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {shopProducts.map(p => {
                    const isSelected = selectedProducts.some(sp => sp.product.id === p.id);
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => {
                          if (isSelected) {
                            setSelectedProducts(prev => prev.filter(sp => sp.product.id !== p.id));
                          } else {
                            setSelectedProducts(prev => [...prev, { product: p, quantity: 1 }]);
                          }
                        }}
                        className={`cursor-pointer rounded-xl border-2 overflow-hidden transition-all relative ${isSelected ? 'border-primary shadow-sm ring-2 ring-primary/20' : 'border-border hover:border-gray-300'}`}
                      >
                        <div className="aspect-square bg-gray-100">
                          {p.image_url ? (
                             <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                             <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No Image</div>
                          )}
                        </div>
                        <div className="p-2 bg-surface text-xs font-medium truncate" title={p.name}>{p.name}</div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1 shadow-md">
                            <Check size={14} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-border flex justify-end bg-surface rounded-b-2xl shrink-0">
              <Button onClick={() => setIsPickerOpen(false)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;

