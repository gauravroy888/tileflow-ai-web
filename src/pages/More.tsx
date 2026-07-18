import { ChevronRight, CircleHelp, Languages, LogOut, Settings2, ShieldCheck, Store, UsersRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

const items = [
  { id: 'settings', icon: Store, title: 'Showroom profile', description: 'Business details and catalogue settings' },
  { id: 'team', icon: UsersRound, title: 'Team access', description: 'Invite and manage showroom staff' },
  { id: 'language', icon: Languages, title: 'Language', description: 'English and Hindi display preferences' },
  { id: 'privacy', icon: ShieldCheck, title: 'Privacy & data', description: 'Customer data and AI preferences' },
  { id: 'help', icon: CircleHelp, title: 'Help centre', description: 'Guides for your sales workspace' },
];

const More = () => {
  const navigate = useNavigate();

  return (
    <div className="page-shell mx-auto max-w-screen-xl space-y-5">
      <header>
        <p className="eyebrow">Workspace settings</p>
        <h2 className="mt-0.5 text-2xl font-extrabold tracking-tight">More</h2>
        <p className="mt-1 text-sm text-textSecondary">Manage the way your showroom works.</p>
      </header>

      <section className="rounded-2xl bg-primary p-5 text-white shadow-[0_14px_32px_rgba(13,45,77,0.16)]">
        <div className="flex items-start gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-[#F5C4AA]"><Settings2 size={21} /></div><div><p className="text-sm font-extrabold">RetailFlow workspace</p><p className="mt-1 text-sm leading-5 text-white/70">Set up your team, customer experience and showroom preferences.</p></div></div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <button 
              key={item.title} 
              onClick={() => {
                if (item.id === 'settings') {
                  navigate('/settings');
                }
              }}
              className={`flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-sand/60 ${index ? 'border-t border-border' : ''}`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sand text-primary"><Icon size={19} /></div>
              <div className="min-w-0 flex-1"><p className="text-sm font-extrabold">{item.title}</p><p className="mt-0.5 truncate text-xs text-textSecondary">{item.description}</p></div>
              <ChevronRight size={18} className="text-stone" />
            </button>
          );
        })}
      </section>

      <button onClick={() => supabase.auth.signOut()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E7B8B8] bg-[#FFF8F8] py-3.5 text-sm font-extrabold text-error transition-colors hover:bg-[#FDEEEE]"><LogOut size={17} /> Sign out</button>
    </div>
  );
};

export default More;
