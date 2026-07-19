import { ArrowUpRight, BellRing, ChevronRight, ClipboardList, Clock3, FileText, PackageSearch, Sparkles, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useRetailProfile } from '../components/providers/RetailProfileProvider';
import { useDashboardStats } from '../hooks/useDashboardStats';

const formatRupee = (amount: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(amount);

const Dashboard = () => {
  const { t } = useTranslation();
  const { labels, profile, shop } = useRetailProfile();
  
  const { stats, loading } = useDashboardStats(shop?.id);

  const aiTitle = profile.id === 'tiles' ? t('dashboard.ai_visualise') : 
                  profile.id === 'electronics' ? t('dashboard.ai_compare') :
                  profile.id === 'salon' ? t('dashboard.ai_reminders') : t('dashboard.ai_assistant');

  const aiDesc = profile.id === 'tiles' ? t('dashboard.ai_visualise_desc') :
                 profile.id === 'electronics' ? t('dashboard.ai_compare_desc') :
                 profile.id === 'salon' ? t('dashboard.ai_reminders_desc') : t('dashboard.ai_assistant_desc');

  return (
    <div className="page-shell mx-auto max-w-screen-xl space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-hero px-5 py-6 text-heroText shadow-[0_18px_42px_rgba(13,45,77,0.2)] sm:px-7">
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full border-[24px] border-heroText/10" />
        <div className="absolute right-5 top-5 text-heroText/20">
          <Sparkles size={96} strokeWidth={1} />
        </div>
        <div className="relative flex items-start justify-between gap-5">
          <div>
            <p className="text-sm font-medium text-heroText/70">{t('dashboard.date')}</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{t('dashboard.welcome')}</h2>
            <p className="relative mt-2 max-w-md text-sm leading-6 text-heroText/75">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-heroText/10 text-heroText">
            <Sparkles size={21} />
          </div>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-2 sm:flex sm:gap-3">
          <Link to="/customers" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-background px-4 text-sm font-bold text-textPrimary transition-transform hover:-translate-y-0.5">
            <UserPlus size={17} /> {t('dashboard.add_lead')}
          </Link>
          <Link to="/quotes/new" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background/50 px-4 text-sm font-bold text-textPrimary transition-colors hover:bg-background/80">
            <FileText size={17} /> {t('dashboard.create_quote')}
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="eyebrow">{t('dashboard.glance')}</p>
            <h3 className="mt-0.5 text-xl font-extrabold tracking-tight">{t('dashboard.workspace')}</h3>
          </div>
          <span className="rounded-full bg-accentSoft px-3 py-1 text-xs font-bold text-[#9A482A]">{t('dashboard.updated')}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><BellRing size={18} /></div>
            <p className="mt-4 text-2xl font-extrabold">{loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-border"></span> : stats.followUpsCount}</p>
            <p className="mt-0.5 text-xs font-semibold text-textSecondary">{t('dashboard.follow_ups')}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/10 text-success"><ClipboardList size={18} /></div>
            <p className="mt-4 text-2xl font-extrabold">{loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-border"></span> : stats.projectLeadsCount}</p>
            <p className="mt-0.5 text-xs font-semibold text-textSecondary"><span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-textSecondary">{labels.metrics.active}</span></p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent"><FileText size={18} /></div>
            <p className="mt-4 text-xl font-extrabold">{loading ? <span className="inline-block h-7 w-20 animate-pulse rounded bg-border"></span> : formatRupee(stats.openQuotesTotal)}</p>
            <p className="mt-0.5 text-xs font-semibold text-textSecondary"><span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-textSecondary">{labels.metrics.total}</span></p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning/10 text-warning"><PackageSearch size={18} /></div>
            <p className="mt-4 text-2xl font-extrabold">{loading ? <span className="inline-block h-7 w-12 animate-pulse rounded bg-border"></span> : stats.recentSalesCount}</p>
            <p className="mt-0.5 text-xs font-semibold text-textSecondary"><span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-textSecondary">{labels.metrics.pending}</span></p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-5">
          <div>
            <p className="eyebrow">{t('dashboard.deals')}</p>
            <h3 className="mt-0.5 text-lg font-extrabold">{t('dashboard.attention')}</h3>
          </div>
          <Link to="/customers" className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">{t('dashboard.view_all')} <ArrowUpRight size={14} /></Link>
        </div>
        <div className="divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center text-textSecondary animate-pulse">Loading follow-ups...</div>
          ) : stats.followUpList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
                <ClipboardList size={28} />
              </div>
              <p className="text-sm font-extrabold text-textPrimary">No follow-ups due</p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-textSecondary">You've caught up with all your leads. Great job!</p>
            </div>
          ) : (
            stats.followUpList.map((customer, index) => {
              const tone = index % 3 === 0 ? 'bg-accent/10 text-accent' : index % 3 === 1 ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary';
              const initials = customer.name.substring(0, 2).toUpperCase();
              return (
                <Link key={customer.id} to="/customers" className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-sand/60 sm:px-5">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${tone}`}>{initials}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{customer.name}</p>
                    <p className="truncate text-xs text-textSecondary">{customer.project_type || 'General inquiry'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-accent">Pending</p>
                    <p className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-textSecondary"><Clock3 size={12} /> {t('dashboard.follow_up_action')}</p>
                  </div>
                  <ChevronRight size={18} className="text-stone" />
                </Link>
              );
            })
          )}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link to="/products" className="group rounded-2xl border border-border bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
          <div className="flex items-start justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sand text-primary"><PackageSearch size={19} /></div><ChevronRight size={18} className="text-stone transition-transform group-hover:translate-x-0.5" /></div>
          <h3 className="mt-5 text-base font-extrabold">Inventory workspace</h3>
          <p className="mt-1 text-sm leading-5 text-textSecondary">Browse product samples, availability and prices in one place.</p>
        </Link>
        <Link to="/ai" className="group rounded-2xl border border-border bg-background p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
          <div className="flex items-start justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-background"><Sparkles size={19} /></div><ChevronRight size={18} className="text-primary/50 transition-transform group-hover:translate-x-0.5" /></div>
          <h3 className="mt-5 text-base font-extrabold">{aiTitle}</h3>
          <p className="mt-1 text-sm leading-5 text-textSecondary">{aiDesc}</p>
        </Link>
      </section>
    </div>
  );
};

export default Dashboard;
