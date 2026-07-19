import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

import { Home, UsersRound, LayoutGrid, Sparkles, Menu, Languages, Bell, Grid2X2, Store, Grid, Sofa, Bath, Lightbulb, Monitor, Pill, Scissors, Package, CalendarClock, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRetailProfile } from '../providers/RetailProfileProvider';
import { useNotifications } from '../../hooks/useNotifications';

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
  
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications(shop?.id);

  const [showNotifications, setShowNotifications] = useState(false);

  const toggleLanguage = () => {
    const current = i18n.resolvedLanguage || i18n.language;
    const newLang = current.startsWith('en') ? 'hi' : 'en';
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

  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'feature': return { icon: Sparkles, color: 'text-primary', bg: 'bg-primary/10' };
      case 'alert': return { icon: Package, color: 'text-error', bg: 'bg-error/10' };
      case 'follow_up': return { icon: CalendarClock, color: 'text-warning', bg: 'bg-warning/10' };
      default: return { icon: Info, color: 'text-textSecondary', bg: 'bg-sand' };
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 px-4 py-2.5 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-background shadow-[0_8px_16px_rgba(13,45,77,0.16)] overflow-hidden">
              {shop?.settings?.logoUrl ? (
                <img src={shop.settings.logoUrl} alt="Store Logo" className="h-full w-full object-contain bg-white" />
              ) : (
                <ProfileIcon size={19} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-base font-extrabold tracking-tight text-primary">{shop?.name || 'RetailFlow'}</h1>
                <span className="hidden rounded-full bg-sand px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.1em] text-textSecondary sm:inline">{profile.displayName}</span>
              </div>
              <p className="mt-0.5 truncate text-[11px] font-medium text-textSecondary">Customer & catalogue workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-1" ref={notificationsRef}>
            <button onClick={toggleLanguage} className="flex h-10 items-center gap-1 rounded-xl px-2.5 text-xs font-extrabold text-textSecondary transition-colors hover:bg-sand hover:text-primary" aria-label="Change language">
              <Languages size={17} />
              {(i18n.resolvedLanguage || i18n.language).startsWith('en') ? 'HI' : 'EN'}
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)} 
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${showNotifications ? 'border-border bg-surface text-primary shadow-sm' : 'border-transparent text-textSecondary hover:border-border hover:bg-surface hover:text-primary'}`} 
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent ring-2 ring-background" />}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 origin-top-right">
                  <div className="flex items-center justify-between border-b border-border bg-sand/30 px-4 py-3">
                    <h3 className="font-extrabold text-textPrimary">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-extrabold text-accent">{unreadCount} new</span>
                    )}
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-textSecondary">
                        <Bell size={24} className="mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No new notifications</p>
                      </div>
                    ) : (
                      notifications.map((notif, index) => {
                        const { icon: Icon, color, bg } = getIconForType(notif.type);
                        return (
                          <button 
                            key={notif.id} 
                            onClick={() => {
                              if (!notif.is_read) markAsRead(notif.id);
                            }}
                            className={`flex w-full gap-3 p-4 text-left transition-colors hover:bg-sand/50 ${index > 0 ? 'border-t border-border' : ''} ${!notif.is_read ? 'bg-primary/5' : ''}`}
                          >
                            <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bg} ${color}`}>
                              <Icon size={18} />
                            </div>
                            <div>
                              <h4 className={`text-sm ${notif.is_read ? 'font-bold text-textPrimary' : 'font-extrabold text-primary'}`}>{notif.title}</h4>
                              <p className="mt-1 text-xs leading-relaxed text-textSecondary">{notif.message}</p>
                              <span className="mt-2 block text-[10px] font-bold tracking-wider text-textSecondary/70 uppercase">
                                {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            {!notif.is_read && <div className="mt-2 h-2 w-2 rounded-full bg-accent shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                  {notifications.length > 0 && (
                    <div className="border-t border-border p-2">
                      <button 
                        onClick={() => markAllAsRead()}
                        className="w-full rounded-xl py-2 text-center text-xs font-extrabold text-primary transition-colors hover:bg-sand"
                      >
                        Mark all as read
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
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
