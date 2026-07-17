
import { Outlet, Link, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Home, Users, Grid, Sparkles, Menu, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

const MobileLayout = () => {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [shopName, setShopName] = useState<string | null>(null);

  useEffect(() => {
    const fetchShopName = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('shops(name)')
        .eq('id', user.id)
        .single();
      if (error) {
        console.error("Error fetching shop name:", error);
        return;
      }
      const shop = data?.shops as any;
      if (shop?.name) setShopName(shop.name);
    };
    fetchShopName();
  }, []);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  const navItems = [
    { name: t('nav.dashboard'), path: '/', icon: Home },
    { name: t('nav.customers'), path: '/customers', icon: Users },
    { name: t('nav.products'), path: '/products', icon: Grid },
    { name: t('nav.ai'), path: '/ai', icon: Sparkles },
    { name: t('nav.more'), path: '/more', icon: Menu },
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Bar */}
      <header className="bg-surface px-4 py-3 flex justify-between items-center shadow-sm sticky top-0 z-10 border-b border-border">
        <h1 className="text-xl font-bold text-primary">{shopName || t('app_name')}</h1>
        <div className="flex items-center gap-4">
          <button onClick={toggleLanguage} className="text-textSecondary hover:text-primary flex items-center gap-1 text-sm font-medium">
            <Languages size={18} />
            {i18n.language === 'en' ? 'HI' : 'EN'}
          </button>
          {/* Logout Button */}
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="text-textSecondary hover:text-red-500 flex items-center gap-1 text-sm font-medium"
            title="Sign Out"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-16">
        <div className="max-w-screen-xl mx-auto w-full">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-surface fixed bottom-0 w-full border-t border-border flex justify-around items-center h-16 z-10 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-primary' : 'text-textSecondary'
              }`}
            >
              <Icon size={24} className={isActive ? 'text-primary' : ''} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileLayout;
