import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Mail, ShieldCheck, UsersRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRetailProfile } from '../../components/providers/RetailProfileProvider';
import { Button } from '../../components/ui/Button';

interface TeamMember {
  id: string;
  full_name: string | null;
  role: 'owner' | 'sales_executive';
  email?: string;
}

const TeamAccess = () => {
  const navigate = useNavigate();
  const { shop } = useRetailProfile();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<{ id: string; role: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('id, role').eq('id', user.id).single();
        if (data) setCurrentUserProfile(data);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (shop?.id) {
      fetchTeamMembers();
    }
  }, [shop?.id]);

  const fetchTeamMembers = async () => {
    if (!shop?.id) return;
    
    // In Supabase, the profiles table contains team members for a shop.
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('shop_id', shop.id)
      .order('role', { ascending: true }); // owner first

    if (data) {
      setMembers(data as TeamMember[]);
    }
    setLoading(false);
  };

  return (
    <div className="page-shell mx-auto max-w-screen-xl">
      <header className="mb-6">
        <button onClick={() => navigate('/more')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-extrabold text-textSecondary transition-colors hover:text-primary">
          <ChevronLeft size={16} /> Back to More
        </button>
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Team access</h2>
            <p className="mt-1 text-sm text-textSecondary">Manage your showroom staff.</p>
          </div>
          <Button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2">
            <UsersRound size={16} /> Invite Member
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          {members.map((member, index) => (
            <div key={member.id} className={`flex items-center justify-between p-5 ${index > 0 ? 'border-t border-border' : ''}`}>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sand text-primary font-bold text-lg">
                  {member.full_name ? member.full_name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <p className="font-extrabold text-textPrimary">{member.full_name || 'Unnamed User'}</p>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-textSecondary">
                    {member.role === 'owner' ? <ShieldCheck size={14} className="text-accent" /> : <UsersRound size={14} />}
                    <span className="capitalize">{member.role.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
              {currentUserProfile?.role === 'owner' && member.id !== currentUserProfile.id && (
                <button className="text-sm font-bold text-error hover:bg-error/10 px-3 py-1.5 rounded-lg transition-colors">
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Coming Soon Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowInviteModal(false)} />
          <div className="relative w-full max-w-sm rounded-3xl bg-surface p-6 shadow-2xl z-[201]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Mail size={24} />
            </div>
            <h3 className="text-center text-lg font-extrabold text-textPrimary">Invite coming soon</h3>
            <p className="mt-2 text-center text-sm leading-relaxed text-textSecondary">
              We're polishing the multi-user invitation flow. Soon, you'll be able to send secure email invites to your sales executives to join your RetailFlow workspace!
            </p>
            <Button onClick={() => setShowInviteModal(false)} className="mt-6 w-full py-3">
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamAccess;
