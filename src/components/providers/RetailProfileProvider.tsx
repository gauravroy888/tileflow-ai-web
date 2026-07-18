import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { retailProfiles } from '../../config/retailProfiles';
import type { RetailProfile, ModuleId } from '../../config/retailProfiles';

interface ShopConfig {
  id: string;
  name: string;
  retail_profile_id: string | null;
  enabled_modules: ModuleId[];
  branding: Record<string, any>;
  onboarding_completed: boolean;
}

interface RetailProfileContextType {
  shop: ShopConfig | null;
  profile: RetailProfile;
  modules: ModuleId[];
  hasModule: (module: ModuleId) => boolean;
  labels: RetailProfile['copy'];
  productFieldSchema: RetailProfile['productFieldSchema'];
  calculatorKey: RetailProfile['calculatorKey'];
  aiProfileKey: RetailProfile['aiProfileKey'];
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
}

const RetailProfileContext = createContext<RetailProfileContextType | undefined>(undefined);

export const RetailProfileProvider: React.FC<{ children: React.ReactNode, userId: string }> = ({ children, userId }) => {
  const [shop, setShop] = useState<ShopConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get user's profile to find their shop_id
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      if (!userProfile?.shop_id) throw new Error('No shop associated with user');

      // 2. Fetch shop configuration
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('*')
        .eq('id', userProfile.shop_id)
        .single();

      if (shopError) throw shopError;
      setShop(shopData as ShopConfig);
    } catch (err: any) {
      console.error('Error fetching retail profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  // Resolve profile from registry, fallback to 'showroom'
  const profileId = shop?.retail_profile_id || 'showroom';
  const profile = retailProfiles[profileId] || retailProfiles['showroom'];
  const modules = shop?.enabled_modules || [];

  const contextValue: RetailProfileContextType = {
    shop,
    profile,
    modules,
    hasModule: (mod: ModuleId) => modules.includes(mod),
    labels: profile.copy,
    productFieldSchema: profile.productFieldSchema,
    calculatorKey: profile.calculatorKey,
    aiProfileKey: profile.aiProfileKey,
    loading,
    error,
    refreshProfile: fetchProfile,
  };

  return (
    <RetailProfileContext.Provider value={contextValue}>
      {children}
    </RetailProfileContext.Provider>
  );
};

export const useRetailProfile = () => {
  const context = useContext(RetailProfileContext);
  if (context === undefined) {
    throw new Error('useRetailProfile must be used within a RetailProfileProvider');
  }
  return context;
};
