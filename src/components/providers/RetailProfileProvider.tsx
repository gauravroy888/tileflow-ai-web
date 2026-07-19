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
  settings?: Record<string, any>;
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

  // Inject theme variables
  useEffect(() => {
    const root = document.documentElement;
    const themePref = shop?.branding?.theme || 'dynamic';
    
    // First, clear all previously injected theme variables
    const themeKeys = ['primary', 'primaryHover', 'surface', 'surfaceHover', 'background', 'textPrimary', 'textSecondary', 'border', 'accent', 'accentSoft', 'success', 'warning', 'error', 'sand', 'stone', 'hero', 'heroText'];
    themeKeys.forEach(key => root.style.removeProperty(`--theme-${key}`));

    let themeToApply: Record<string, string> | undefined = undefined;
    if (themePref === 'dynamic' && profile.theme) {
      themeToApply = {
        ...profile.theme,
        hero: (profile.theme as any).primary,
        heroText: '#FFFFFF',
      } as Record<string, string>;
    } else if (themePref === 'dark') {
      themeToApply = {
        primary: '#FFFFFF',
        primaryHover: '#E5E7EB',
        surface: '#121212',
        surfaceHover: '#1E1E1E',
        background: '#050505',
        textPrimary: '#FFFFFF',
        textSecondary: '#A3A3A3',
        border: '#262626',
        accent: '#D1D5DB',
        accentSoft: '#1A1A1A',
        success: '#D1D5DB',
        warning: '#D1D5DB',
        error: '#D1D5DB',
        sand: '#1A1A1A',
        stone: '#333333',
        hero: '#121212', // Matches surface
        heroText: '#FFFFFF'
      };
    }

    if (themeToApply) {
      Object.entries(themeToApply).forEach(([key, value]) => {
        root.style.setProperty(`--theme-${key}`, value);
      });
    }
  }, [profile.theme, shop?.branding?.theme]);

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
