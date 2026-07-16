import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { useTranslation } from 'react-i18next';
import type { Profile } from '../types';

const Onboarding = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [shopName, setShopName] = useState('');
  const [shopType, setShopType] = useState('');
  const [loading, setLoading] = useState(false);

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
        navigate('/');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName || !shopType) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', user.id)
        .single<Profile>();

      if (profile?.shop_id) {
        await supabase
          .from('shops')
          .update({
            name: shopName,
            shop_type: shopType,
            onboarding_completed: true
          })
          .eq('id', profile.shop_id);
      }
      
      navigate('/');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center px-6 py-12">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm text-center">
        <h2 className="text-3xl font-bold tracking-tight text-primary">
          {t('onboarding.title')}
        </h2>
        <p className="mt-2 text-sm text-textSecondary">
          {t('onboarding.subtitle')}
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm bg-surface px-6 py-8 shadow-sm rounded-lg border border-border">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium leading-6 text-textPrimary">
              {t('onboarding.shop_name')}
            </label>
            <div className="mt-2">
              <input
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="block w-full rounded-md border-0 py-2.5 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm px-3"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium leading-6 text-textPrimary">
              {t('onboarding.shop_type')}
            </label>
            <div className="mt-2">
              <input
                required
                placeholder={t('onboarding.shop_type_placeholder')}
                value={shopType}
                onChange={(e) => setShopType(e.target.value)}
                className="block w-full rounded-md border-0 py-2.5 text-textPrimary shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary sm:text-sm px-3"
              />
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t('onboarding.saving') : t('onboarding.save')}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
