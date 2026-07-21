import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { toast } from 'react-hot-toast';
import { uploadToR2 } from '../lib/r2Storage';
import { useRetailProfile } from '../components/providers/RetailProfileProvider';
import { retailProfiles } from '../config/retailProfiles';
import type { ModuleId } from '../config/retailProfiles';
import { Check, ArrowLeft } from 'lucide-react';
import { ImageCropModal } from '../components/ui/ImageCropModal';
import { CsvImportTutorialModal } from '../components/products/CsvImportTutorialModal';
import { importProductsFromCSV, exportProductsToCSV } from '../lib/csvHelper';
import { Upload, Loader2 } from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
  const { shop, refreshProfile } = useRetailProfile();
  
  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  
  const [retailProfileId, setRetailProfileId] = useState<string>(shop?.retail_profile_id || 'showroom');
  const [enabledModules, setEnabledModules] = useState<ModuleId[]>(shop?.enabled_modules || []);
  const [shopName, setShopName] = useState(shop?.name || '');
  const [shopSettings, setShopSettings] = useState<Record<string, any>>(shop?.settings || {});
  const [themePreference, setThemePreference] = useState<'default' | 'dark' | 'dynamic'>(shop?.branding?.theme || 'dynamic');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [selectedImageToCrop, setSelectedImageToCrop] = useState<string | null>(null);

  const [showTutorial, setShowTutorial] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateSetting = (key: string, value: any) => {
    setShopSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setSelectedImageToCrop(reader.result?.toString() || null);
    });
    reader.readAsDataURL(file);
    e.target.value = ''; // reset input
  };

  const handleCropComplete = async (croppedFile: File) => {
    setSelectedImageToCrop(null);
    if (!shop?.id) return;

    setUploadingLogo(true);
    try {
      const fileExt = 'png';
      const fileName = `shop-logo-${shop.id}-${Date.now()}.${fileExt}`;
      
      const publicUrl = await uploadToR2(croppedFile, fileName);
      updateSetting('logoUrl', publicUrl);
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo: ' + error.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const [syncingGoogle, setSyncingGoogle] = useState(false);

  const handleConnectGoogle = async () => {
    if (!shop?.id) return;
    try {
      setSyncingGoogle(true);
      const { data: { session } } = await supabase.auth.getSession();
      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-auth?shop_id=${shop.id}`;
      const res = await fetch(functionUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      const resData = await res.json();
      if (res.ok && resData.url) {
        window.location.href = resData.url;
      } else {
        throw new Error(resData.error || 'Failed to get auth URL');
      }
    } catch (err: any) {
      toast.error('Failed to connect: ' + err.message);
    } finally {
      setSyncingGoogle(false);
    }
  };

  const handleSyncGoogle = async () => {
    try {
      setSyncingGoogle(true);
      const { data, error } = await supabase.functions.invoke('sync-google-sheet', {
        method: 'POST'
      });
      if (error) throw error;
      toast.success(data?.message || 'Sync successful!');
      await refreshProfile();
    } catch (err: any) {
      toast.error('Failed to sync: ' + err.message);
    } finally {
      setSyncingGoogle(false);
    }
  };

  const handleOpenPicker = async () => {
    try {
      setSyncingGoogle(true);
      // 1. Get access token from edge function
      const { data, error } = await supabase.functions.invoke('sync-google-sheet?action=get_token', {
        method: 'POST'
      });
      if (error) throw error;
      const token = data?.access_token;
      if (!token) throw new Error('No token returned');

      // 2. Open Google Picker
      const showPicker = () => {
        const picker = new (window as any).google.picker.PickerBuilder()
          .addView((window as any).google.picker.ViewId.SPREADSHEETS)
          .setOAuthToken(token)
          .setCallback(async (pickerData: any) => {
            if (pickerData.action === (window as any).google.picker.Action.PICKED) {
              const doc = pickerData.docs[0];
              const fileId = doc.id;
              
              // Save to shop
              const { error: updateError } = await supabase
                .from('shops')
                .update({ connected_spreadsheet_id: fileId })
                .eq('id', shop?.id);
                
              if (updateError) {
                toast.error('Failed to link spreadsheet');
              } else {
                toast.success(`Spreadsheet linked!`);
                await refreshProfile();
              }
            }
          })
          .build();
        picker.setVisible(true);
      };

      (window as any).gapi.load('picker', { callback: showPicker });
    } catch (err: any) {
      toast.error('Failed to open picker: ' + err.message);
    } finally {
      setSyncingGoogle(false);
    }
  };

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
      // Replace entirely with the selected profile's recommended modules
      setEnabledModules([...profile.recommendedModules]);
    }
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
          branding: { ...(shop?.branding || {}), theme: themePreference },
          settings: shopSettings,
        })
        .eq('id', shop.id);
        
      if (error) throw error;
      
      await refreshProfile();
      navigate('/more');
    } catch (error: any) {
      console.error(error);
      toast.error("Error saving settings: " + (error.message || 'Unknown error'));
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
        <h3 className="text-lg font-bold">General Details</h3>
        <div>
          <label className="block text-sm font-medium text-textPrimary">Shop Name</label>
          <input
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-textPrimary mt-4">Store Logo</label>
          <div className="mt-2 flex items-center gap-4">
            {shopSettings.logoUrl ? (
              <img src={shopSettings.logoUrl} alt="Store Logo" className="h-16 w-16 object-contain rounded border border-border bg-white" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-border bg-surface-hover text-xs text-textSecondary text-center p-2">No logo</div>
            )}
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoFileSelect}
                disabled={uploadingLogo}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className={`cursor-pointer rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold shadow-sm hover:bg-surface-hover ${uploadingLogo ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
              </label>
              {shopSettings.logoUrl && (
                <button
                  type="button"
                  onClick={() => updateSetting('logoUrl', null)}
                  className="ml-3 text-sm font-medium text-error hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-textPrimary mt-4">Contact Phone</label>
          <input
            value={shopSettings.contactPhone || ''}
            onChange={(e) => updateSetting('contactPhone', e.target.value)}
            className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-textPrimary mt-4">Contact Email</label>
          <input
            value={shopSettings.contactEmail || ''}
            onChange={(e) => updateSetting('contactEmail', e.target.value)}
            className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-textPrimary mt-4">Store Address</label>
          <textarea
            value={shopSettings.storeAddress || ''}
            onChange={(e) => updateSetting('storeAddress', e.target.value)}
            rows={2}
            className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-textPrimary mt-4">Tax / GST Number</label>
          <input
            value={shopSettings.taxNumber || ''}
            onChange={(e) => updateSetting('taxNumber', e.target.value)}
            className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h3 className="text-lg font-bold">Business Settings</h3>
        <p className="text-sm text-textSecondary">Specific settings for {retailProfiles[retailProfileId as keyof typeof retailProfiles]?.displayName}</p>
        
        {retailProfileId === 'tiles' || retailProfileId === 'bathware' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-textPrimary mt-4">Default Measurement Unit</label>
              <select
                value={shopSettings.measurementUnit || 'sqft'}
                onChange={(e) => updateSetting('measurementUnit', e.target.value)}
                className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
              >
                <option value="sqft">Sq. Ft</option>
                <option value="sqm">Sq. Meters</option>
                <option value="boxes">Boxes</option>
                <option value="pieces">Pieces</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-textPrimary mt-4">Breakage Policy</label>
              <textarea
                value={shopSettings.breakagePolicy || ''}
                onChange={(e) => updateSetting('breakagePolicy', e.target.value)}
                placeholder="e.g., Transit breakage at owner's risk"
                className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textPrimary mt-4">Delivery Terms</label>
              <input
                value={shopSettings.deliveryTerms || ''}
                onChange={(e) => updateSetting('deliveryTerms', e.target.value)}
                placeholder="e.g., Ex-showroom / Delivery extra"
                className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
              />
            </div>
          </>
        ) : retailProfileId === 'electronics' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-textPrimary mt-4">Default Warranty Terms</label>
              <textarea
                value={shopSettings.warrantyTerms || ''}
                onChange={(e) => updateSetting('warrantyTerms', e.target.value)}
                className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textPrimary mt-4">Exchange Window</label>
              <input
                value={shopSettings.exchangeWindow || ''}
                onChange={(e) => updateSetting('exchangeWindow', e.target.value)}
                placeholder="e.g., 7-day replacement guarantee"
                className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textPrimary mt-4">Installation Policy</label>
              <input
                value={shopSettings.installationPolicy || ''}
                onChange={(e) => updateSetting('installationPolicy', e.target.value)}
                className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
              />
            </div>
          </>
        ) : retailProfileId === 'furniture' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-textPrimary mt-4">Advance Payment Policy</label>
              <input
                value={shopSettings.advancePayment || ''}
                onChange={(e) => updateSetting('advancePayment', e.target.value)}
                placeholder="e.g., 50% advance on custom orders"
                className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textPrimary mt-4">Lead Time</label>
              <input
                value={shopSettings.leadTime || ''}
                onChange={(e) => updateSetting('leadTime', e.target.value)}
                placeholder="e.g., 2-3 weeks for manufacturing"
                className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textPrimary mt-4">Assembly Services</label>
              <input
                value={shopSettings.assemblyServices || ''}
                onChange={(e) => updateSetting('assemblyServices', e.target.value)}
                className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
              />
            </div>
          </>
        ) : retailProfileId === 'lighting' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-textPrimary mt-4">Bulb/LED Guarantee</label>
              <input
                value={shopSettings.ledGuarantee || ''}
                onChange={(e) => updateSetting('ledGuarantee', e.target.value)}
                placeholder="e.g., 1-year replacement on all LEDs"
                className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textPrimary mt-4">Fitting Charges</label>
              <input
                value={shopSettings.fittingCharges || ''}
                onChange={(e) => updateSetting('fittingCharges', e.target.value)}
                placeholder="e.g., Electrician charges extra"
                className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
              />
            </div>
          </>
        ) : retailProfileId === 'pharmacy' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-textPrimary mt-4">Drug License Number</label>
              <input
                value={shopSettings.drugLicense || ''}
                onChange={(e) => updateSetting('drugLicense', e.target.value)}
                className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textPrimary mt-4">Pharmacist Reg. No.</label>
              <input
                value={shopSettings.pharmacistRegNo || ''}
                onChange={(e) => updateSetting('pharmacistRegNo', e.target.value)}
                className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textPrimary mt-4">Return Policy</label>
              <textarea
                value={shopSettings.returnPolicy || ''}
                onChange={(e) => updateSetting('returnPolicy', e.target.value)}
                placeholder="e.g., No returns on cut strips or refrigerated items"
                className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
              />
            </div>
          </>
        ) : retailProfileId === 'salon' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-textPrimary mt-4">Cancellation Policy</label>
              <input
                value={shopSettings.cancellationPolicy || ''}
                onChange={(e) => updateSetting('cancellationPolicy', e.target.value)}
                placeholder="e.g., 24-hour notice required"
                className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textPrimary mt-4">Booking Deposit</label>
              <input
                value={shopSettings.bookingDeposit || ''}
                onChange={(e) => updateSetting('bookingDeposit', e.target.value)}
                placeholder="e.g., 20% advance required to hold slot"
                className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-textPrimary mt-4">Professional Tax ID</label>
              <input
                value={shopSettings.profTaxId || ''}
                onChange={(e) => updateSetting('profTaxId', e.target.value)}
                className="mt-2 block w-full rounded-md border-0 py-2.5 px-3 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm"
              />
            </div>
          </>
        ) : (
          <p className="text-sm text-textSecondary mt-4">No specific settings for this category yet.</p>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h3 className="text-lg font-bold">Theme Preference</h3>
        <p className="text-sm text-textSecondary">Choose the overall visual style of your app.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {[
            { id: 'dynamic', label: 'Dynamic (Business Type)' },
            { id: 'default', label: 'Default (Original)' },
            { id: 'dark', label: 'Dark Mode' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setThemePreference(t.id as any)}
              className={`flex items-center justify-between p-4 rounded-xl border transition-colors text-left ${themePreference === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}
            >
              <span className="font-semibold text-textPrimary">{t.label}</span>
              {themePreference === t.id && <Check size={18} className="text-primary" />}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h3 className="text-lg font-bold">Integrations</h3>
        <p className="text-sm text-textSecondary">Connect external tools like Google Sheets to manage your catalog automatically.</p>
        <div className="mt-4 p-4 border border-border rounded-xl flex items-center justify-between bg-surface">
          <div>
            <h4 className="font-semibold text-textPrimary">Google Sheets Sync</h4>
            <p className="text-sm text-textSecondary">Manage your products in a live spreadsheet.</p>
          </div>
          <div>
            {!shop?.google_refresh_token ? (
              <Button onClick={handleConnectGoogle} disabled={syncingGoogle} className="gap-2">
                Connect Account
              </Button>
            ) : (
              <div className="flex flex-col items-end gap-3">
                <span className="text-sm font-medium text-success flex items-center gap-1"><Check size={16}/> Connected</span>
                <div className="flex items-center gap-2">
                  <Button onClick={handleOpenPicker} disabled={syncingGoogle} variant="outline" className="gap-2">
                    {syncingGoogle ? '...' : 'Select File'}
                  </Button>
                  <Button onClick={handleSyncGoogle} disabled={syncingGoogle} variant="outline" className="gap-2">
                    {syncingGoogle ? 'Syncing...' : 'Sync Now'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 p-4 border border-border rounded-xl flex items-center justify-between bg-surface">
          <div>
            <h4 className="font-semibold text-textPrimary">CSV File Upload</h4>
            <p className="text-sm text-textSecondary">Manually bulk import products using a spreadsheet or ZIP.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowTutorial(true)} disabled={isImporting} className="gap-2">
              {isImporting ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />} Import CSV
            </Button>
            <input type="file" accept=".csv, .zip" className="hidden" ref={fileInputRef} onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !shop?.id) return;
              try {
                setIsImporting(true);
                const count = await importProductsFromCSV(file, shop.id);
                toast.success(`Successfully imported ${count} products!`);
              } catch (err: any) {
                toast.error(err.message || 'Failed to import CSV');
              } finally {
                setIsImporting(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }
            }} />
          </div>
        </div>
      </section>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {selectedImageToCrop && (
        <ImageCropModal
          imageSrc={selectedImageToCrop}
          onClose={() => setSelectedImageToCrop(null)}
          onCropComplete={handleCropComplete}
        />
      )}

      <CsvImportTutorialModal 
        isOpen={showTutorial} 
        onClose={() => setShowTutorial(false)}
        onProceed={() => {
          setShowTutorial(false);
          fileInputRef.current?.click();
        }}
        onDownloadTemplate={() => exportProductsToCSV([])}
      />
    </div>
  );
};

export default Settings;
