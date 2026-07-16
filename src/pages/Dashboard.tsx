
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';

const Dashboard = () => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-textPrimary">Dashboard</h2>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Sign out
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Quick Stats Cards */}
        <div className="bg-surface p-4 rounded-xl shadow-sm border border-border">
          <p className="text-sm text-textSecondary">Today's Visits</p>
          <p className="text-2xl font-bold text-textPrimary mt-1">12</p>
        </div>
        <div className="bg-surface p-4 rounded-xl shadow-sm border border-border">
          <p className="text-sm text-textSecondary">Pending Follow-ups</p>
          <p className="text-2xl font-bold text-warning mt-1">5</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-lg font-semibold text-textPrimary mb-3">
          Recent Quotations
        </h3>
        <div className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <div>
              <p className="font-medium text-textPrimary">Rahul Sharma</p>
              <p className="text-sm text-textSecondary">2 BHK Flooring</p>
            </div>
            <p className="font-bold text-success">₹ 1,45,000</p>
          </div>
          <div className="p-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-textPrimary">Priya Designer</p>
              <p className="text-sm text-textSecondary">Bathroom Tiles</p>
            </div>
            <p className="font-bold text-success">₹ 85,000</p>
          </div>
        </div>
      </div>
      
      {/* AI Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-textPrimary mb-3">
          AI Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Button variant="secondary" className="w-full flex-col h-auto py-4">
            <span className="text-xl mb-1">📸</span>
            <span className="text-sm">Room Visualizer</span>
          </Button>
          <Button variant="secondary" className="w-full flex-col h-auto py-4">
            <span className="text-xl mb-1">🔍</span>
            <span className="text-sm">Find Similar</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
