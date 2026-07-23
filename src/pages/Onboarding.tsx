import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';

import type { Profile } from '../types';
import { retailProfiles } from '../config/retailProfiles';
import type { ModuleId } from '../config/retailProfiles';
import { Check, ChevronRight } from 'lucide-react';

interface OnboardingProps {
  onComplete?: () => void;
}

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

const Onboarding = ({ onComplete }: OnboardingProps) => {
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // State for Step 1
  const [retailProfileId, setRetailProfileId] = useState<string>('');
  
  // State for Step 2
  const [enabledModules, setEnabledModules] = useState<ModuleId[]>([]);
  
  // State for Step 3
  const [shopName, setShopName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    checkExistingOnboarding();
  }, []);

  const checkExistingOnboarding = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate('/login');

    const { data: profile } = await supabase
      .from('profiles')
      .select('shop_id')
      .eq('id', user.id)
      .single<Profile>();

    if (profile?.shop_id) {
      const { data: shop } = await supabase
        .from('shops')
        .select('onboarding_completed')
        .eq('id', profile.shop_id)
        .single();
      
      if (shop?.onboarding_completed) {
        if (onComplete) onComplete();
        navigate('/');
      }
    }
  };

  const handleProfileSelect = (id: string) => {
    setRetailProfileId(id);
    // Pre-select recommended modules
    const profile = retailProfiles[id];
    if (profile) {
      setEnabledModules(profile.recommendedModules);
    }
  };

  const toggleModule = (id: ModuleId) => {
    setEnabledModules(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName || !retailProfileId) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('shop_id, role')
        .eq('id', user.id)
        .single();

      if (profile?.shop_id) {
        if (profile.role !== 'owner') {
           throw new Error('Only owners can set up the shop profile.');
        }

        const branding = {
           currency,
           language,
        };

        const { error: updateError } = await supabase
          .from('shops')
          .update({
            name: shopName,
            retail_profile_id: retailProfileId,
            enabled_modules: enabledModules,
            branding: branding,
            onboarding_completed: true
          })
          .eq('id', profile.shop_id);
          
        if (updateError) {
          alert("Error saving shop details: " + updateError.message);
          setLoading(false);
          return;
        }
      } else {
        alert("Database Error: " + (profileError?.message || "Profile not found"));
        setLoading(false);
        return;
      }
      
      if (onComplete) onComplete();
      navigate('/');
    } catch (error: any) {
      console.error(error);
      alert("Submission Error: " + (error.message || JSON.stringify(error)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-6 py-12">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-3xl font-bold tracking-tight text-primary">
          Setup your workspace
        </h2>
        <div className="mt-4 flex items-center justify-center space-x-2">
           <div className={`h-2 w-8 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-border'}`} />
           <div className={`h-2 w-8 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-border'}`} />
           <div className={`h-2 w-8 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-border'}`} />
        </div>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md bg-surface px-6 py-8 shadow-sm rounded-lg border border-border">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-textPrimary">1. Choose business type</h3>
            <p className="text-sm text-textSecondary">Select your primary business category.</p>
            <div className="grid grid-cols-1 gap-3 mt-4">
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
            <Button 
              className="w-full mt-6" 
              disabled={!retailProfileId} 
              onClick={() => setStep(2)}
            >
              Continue <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-textPrimary">2. Confirm operations</h3>
            <p className="text-sm text-textSecondary">We've preselected recommended modules for {retailProfiles[retailProfileId]?.displayName}. You can edit these later.</p>
            <div className="grid grid-cols-2 gap-3 mt-4">
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
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)}>Continue <ChevronRight size={16} className="ml-1" /></Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <h3 className="text-lg font-bold text-textPrimary">3. Personalise workspace</h3>
            <p className="text-sm text-textSecondary">Set your basic preferences.</p>
            
            <div>
              <label className="block text-sm font-medium leading-6 text-textPrimary">
                Shop Name
              </label>
              <div className="mt-2">
                <input
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="block w-full rounded-md border-0 py-2.5 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm px-3"
                  placeholder="e.g. Acme Retail"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium leading-6 text-textPrimary">Currency</label>
                <select 
                  value={currency} 
                  onChange={e => setCurrency(e.target.value)}
                  className="mt-2 block w-full rounded-md border-0 py-2.5 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm px-3"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium leading-6 text-textPrimary">Language</label>
                <select 
                  value={language} 
                  onChange={e => setLanguage(e.target.value)}
                  className="mt-2 block w-full rounded-md border-0 py-2.5 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm px-3"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="es">Spanish</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>Back</Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Saving...' : 'Finish Setup'}
              </Button>
            </div>
          </form>
        )}
      </div>
      
      {step === 1 && (
        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          <Button 
            type="button" 
            variant="outline" 
            className="w-full text-textSecondary" 
            onClick={() => supabase.auth.signOut()}
          >
            Sign Out & Try Different Account
          </Button>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
