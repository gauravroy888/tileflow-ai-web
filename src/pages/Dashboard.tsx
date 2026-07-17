import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { t } = useTranslation();

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-textPrimary">{t('dashboard.title')}</h2>
        <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
          {t('dashboard.sign_out')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface p-4 rounded-xl shadow-sm border border-border">
          <p className="text-sm text-textSecondary font-medium">{t('dashboard.today_visits')}</p>
          <p className="text-3xl font-bold text-textPrimary mt-1">12</p>
        </div>
        <div className="bg-surface p-4 rounded-xl shadow-sm border border-border">
          <p className="text-sm text-textSecondary font-medium">{t('dashboard.pending_followups')}</p>
          <p className="text-3xl font-bold text-orange-500 mt-1">5</p>
        </div>
      </div>

      {/* Recent Quotations */}
      <div>
        <h3 className="text-lg font-bold text-textPrimary mb-3">{t('dashboard.recent_quotations')}</h3>
        <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
          {[
            { id: 1, name: 'Rahul Sharma', desc: 'Flooring', amt: '1,45,000' },
            { id: 2, name: 'Priya Designer', desc: 'Bathroom', amt: '85,000' }
          ].map((q, i) => (
            <div key={q.id} className={`p-4 flex justify-between items-center ${i !== 0 ? 'border-t border-border' : ''}`}>
              <div>
                <p className="font-bold text-textPrimary">{q.name}</p>
                <p className="text-xs text-textSecondary">{q.desc}</p>
              </div>
              <p className="font-bold text-green-600">₹ {q.amt}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Quick Actions */}
      <div>
        <h3 className="text-lg font-bold text-textPrimary mb-3">{t('dashboard.ai_quick_actions')}</h3>
        <div className="grid grid-cols-2 gap-4">
          <Link to="/ai" className="bg-surface p-4 rounded-xl shadow-sm border border-border flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
            <span className="text-2xl">📦</span>
            <span className="text-sm font-medium text-textPrimary">{t('dashboard.inventory_scanner')}</span>
          </Link>
          <Link to="/ai" className="bg-surface p-4 rounded-xl shadow-sm border border-border flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
            <span className="text-2xl">🔍</span>
            <span className="text-sm font-medium text-textPrimary">{t('dashboard.find_similar')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
