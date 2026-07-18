import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { useRetailProfile } from '../components/providers/RetailProfileProvider';
import { retailProfiles } from '../config/retailProfiles';
import type { ModuleId } from '../config/retailProfiles';
import { Check, ArrowLeft, Info } from 'lucide-react';

const ALL_MODULES: { id: ModuleId; label: string }[] = [
  { id: 'variants', label: 'Product Variants' },
  { id: 'serialized', label: 'Serialized Items' },
  { id: 'batch_expiry', label: 'Batch / Expiry' },
  { id: 'project_sales', label: 'Project Sales' },
  { id: 'service', label: 'Services & Bookings' },
  { id: 'delivery', label: 'Delivery' },
  { id: 'installation', label: 'Installation' },
  { id: 'warranty', label: 'Warranty Management' },
  { id: 'wholesale', label: 'Wholesale' },
  { id: 'multi_store', label: 'Multi-store' },
];

const Settings = () => {
  const navigate = useNavigate();
  const { shop, refreshProfile } = useRetailProfile();
  
  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  
  const [retailProfileId, setRetailProfileId] = useState<string>(shop?.retail_profile_id || 'showroom');
  const [enabledModules, setEnabledModules] = useState<ModuleId[]>(shop?.enabled_modules || []);
  const [shopName, setShopName] = useState(shop?.name || '');

  useEffect(() => {
    checkRole();
  }, []);

  const checkRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role === 'owner') {
      setIsOwner(true);
    }
  };

  const handleProfileSelect = (id: string) => {
    setRetailProfileId(id);
    const profile = retailProfiles[id];
    if (profile) {
      // Merge recommended with currently enabled to avoid losing user's custom toggles
      const newModules = new Set([...enabledModules, ...profile.recommendedModules]);
      setEnabledModules(Array.from(newModules));
    }
  };

  const toggleModule = (id: ModuleId) => {
    setEnabledModules(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!shop?.id || !isOwner) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('shops')
        .update({
          name: shopName,
          retail_profile_id: retailProfileId,
          enabled_modules: enabledModules,
        })
        .eq('id', shop.id);
        
      if (error) throw error;
      
      await refreshProfile();
      navigate('/more');
    } catch (error: any) {
      console.error(error);
      alert("Error saving settings: " + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOwner) {
    return (
      <div className="p-6 text-center">
        <p>Only store owners can modify these settings.</p>
        <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="page-shell mx-auto max-w-screen-xl space-y-6 pb-20">
      <header className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-surface-hover">
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="eyebrow">Workspace Configuration</p>
          <h2 className="mt-0.5 text-2xl font-extrabold tracking-tight">Showroom Profile</h2>
        </div>
      </header>

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h3 className="text-lg font-bold">General Details</h3>
        <div>
          <label className="block text-sm font-medium text-textPrimary">Shop Name</label>
          <input
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h3 className="text-lg font-bold">Business Category</h3>
        <p className="text-sm text-textSecondary">Changing this updates labels, icons, and product fields across the app.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {Object.values(retailProfiles).filter(p => p.id !== 'showroom').map(p => (
            <button
              key={p.id}
              onClick={() => handleProfileSelect(p.id)}
              className={`flex items-center justify-between p-4 rounded-xl border transition-colors text-left ${retailProfileId === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
            >
              <span className="font-semibold text-textPrimary">{p.displayName}</span>
              {retailProfileId === p.id && <Check size={18} className="text-primary" />}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-start gap-2">
          <h3 className="text-lg font-bold">Operation Modules</h3>
        </div>
        <div className="flex items-start gap-2 text-sm text-textSecondary bg-sand p-3 rounded-lg">
          <Info size={16} className="shrink-0 mt-0.5 text-primary" />
          <p>Disabling a module hides its interface in the app, but it <strong>never deletes your existing data</strong>.</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
           {ALL_MODULES.map(m => {
             const isEnabled = enabledModules.includes(m.id);
             return (
               <button
                 key={m.id}
                 onClick={() => toggleModule(m.id)}
                 className={`flex flex-col items-start p-3 rounded-xl border text-left transition-colors ${isEnabled ? 'border-primary bg-primary/5' : 'border-border hover:bg-surface-hover'}`}
               >
                  <div className="flex w-full justify-between items-center mb-1">
                     <span className={`text-xs font-bold ${isEnabled ? 'text-primary' : 'text-textSecondary'}`}>
                        {isEnabled ? 'Enabled' : 'Optional'}
                     </span>
                     {isEnabled && <Check size={14} className="text-primary" />}
                  </div>
                  <span className="text-sm font-semibold text-textPrimary">{m.label}</span>
               </button>
             );
           })}
        </div>
      </section>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
