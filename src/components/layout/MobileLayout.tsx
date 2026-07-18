import { Outlet, NavLink } from 'react-router-dom';

import { Home, UsersRound, LayoutGrid, Sparkles, Menu, Languages, Bell, Grid2X2, Store, Grid, Sofa, Bath, Lightbulb, Monitor, Pill, Scissors } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRetailProfile } from '../providers/RetailProfileProvider';

const iconMap: Record<string, any> = {
  store: Store,
  grid: Grid,
  sofa: Sofa,
  bath: Bath,
  lightbulb: Lightbulb,
  monitor: Monitor,
  pill: Pill,
  scissors: Scissors,
};

const MobileLayout = () => {
  const { t, i18n } = useTranslation();
  const { shop, profile } = useRetailProfile();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  const navItems = [
    { name: t('nav.dashboard'), path: '/', icon: Home },
    { name: t('nav.customers'), path: '/customers', icon: UsersRound },
    { name: t('nav.products'), path: '/products', icon: LayoutGrid },
    { name: t('nav.ai'), path: '/ai', icon: Sparkles },
    { name: t('nav.more'), path: '/more', icon: Menu },
  ];

  const ProfileIcon = iconMap[profile.iconKey] || Grid2X2;

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 px-4 py-2.5 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-[0_8px_16px_rgba(13,45,77,0.16)]">
              <ProfileIcon size={19} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-extrabold tracking-tight text-primary">{shop?.name || 'RetailFlow'}</h1>
                <span className="hidden rounded-full bg-sand px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-textSecondary sm:inline">{profile.displayName}</span>
              </div>
              <p className="mt-0.5 truncate text-[11px] font-medium text-textSecondary">Customer & catalogue workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={toggleLanguage} className="flex h-10 items-center gap-1 rounded-xl px-2.5 text-xs font-extrabold text-textSecondary transition-colors hover:bg-sand hover:text-primary" aria-label="Change language">
              <Languages size={17} />
              {i18n.language === 'en' ? 'HI' : 'EN'}
            </button>
            <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-textSecondary transition-colors hover:border-border hover:bg-surface hover:text-primary" aria-label="Notifications">
              <Bell size={18} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent ring-2 ring-background" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-screen-xl mx-auto w-full">
          <Outlet />
        </div>
      </main>

      <nav className="safe-bottom fixed bottom-0 z-20 w-full border-t border-border/80 bg-surface/95 px-2 pt-2 shadow-[0_-8px_30px_rgba(23,33,43,0.06)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-screen-xl items-stretch justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `relative flex h-full min-w-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold transition-colors ${isActive ? 'text-primary' : 'text-textSecondary hover:text-primary'}`}
            >
              {({ isActive }) => <>
                {isActive && <span className="absolute top-0 h-1 w-7 rounded-full bg-accent" />}
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.name}</span>
              </>}
            </NavLink>
          );
        })}
        </div>
      </nav>
    </div>
  );
};

export default MobileLayout;
