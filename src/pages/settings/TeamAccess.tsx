import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ShieldCheck, UsersRound, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useRetailProfile } from '../../components/providers/RetailProfileProvider';
import { Button } from '../../components/ui/Button';

interface TeamMember {
  id: string;
  full_name: string | null;
  role: 'owner' | 'sales_executive';
  has_full_access?: boolean;
}

const TeamAccess = () => {
  const navigate = useNavigate();
  const { shop } = useRetailProfile();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [addedMember, setAddedMember] = useState<{ name: string; email: string; password: string } | null>(null);

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
    if (shop?.id) fetchTeamMembers();
  }, [shop?.id]);

  const fetchTeamMembers = async () => {
    if (!shop?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, has_full_access')
      .eq('shop_id', shop.id)
      .order('role', { ascending: true });
    if (data) setMembers(data as TeamMember[]);
    setLoading(false);
  };

  const openModal = () => {
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberPassword('');
    setAddError('');
    setAddedMember(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setAddedMember(null);
  };

  const toggleFullAccess = async (memberId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, has_full_access: newStatus } : m));
    const { error } = await supabase.from('profiles').update({ has_full_access: newStatus }).eq('id', memberId);
    if (error) {
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, has_full_access: currentStatus } : m));
      toast.error('Failed to update access: ' + error.message);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    const confirmed = window.confirm(`Remove ${memberName} from your workspace?\n\nThey will lose access immediately.`);
    if (!confirmed) return;
    setMembers(prev => prev.filter(m => m.id !== memberId));
    const { error } = await supabase.from('profiles').update({ shop_id: null }).eq('id', memberId);
    if (error) {
      fetchTeamMembers();
      toast.error('Failed to remove member: ' + error.message);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName || !newMemberEmail || !newMemberPassword) return;
    if (newMemberPassword.length < 6) {
      setAddError('Password must be at least 6 characters.');
      return;
    }

    setIsAdding(true);
    setAddError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/add-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          email: newMemberEmail,
          full_name: newMemberName,
          password: newMemberPassword,
          shop_id: shop?.id,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add member');

      // Refresh list and show success
      await fetchTeamMembers();
      setAddedMember({ name: newMemberName, email: newMemberEmail, password: newMemberPassword });

    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setIsAdding(false);
    }
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
          <div className="text-right">
            <Button disabled={members.length >= 3} onClick={openModal} className="flex items-center gap-2">
              <UsersRound size={16} /> Add Member
            </Button>
            {members.length >= 3 && <p className="mt-1 text-xs font-bold text-error">Workspace limit reached (3/3)</p>}
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
          <UsersRound size={32} className="text-border mb-3" />
          <p className="font-bold text-textPrimary">No team members yet</p>
          <p className="mt-1 text-sm text-textSecondary">Add a sales executive to get started.</p>
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
                    {member.role !== 'owner' && (
                      <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${member.has_full_access ? 'bg-primary/10 text-primary' : 'bg-border text-textSecondary'}`}>
                        {member.has_full_access ? 'Full Access' : 'Restricted'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {currentUserProfile?.role === 'owner' && member.id !== currentUserProfile.id && (
                <div className="flex items-center gap-4">
                  {member.role !== 'owner' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-xs font-bold text-textSecondary">Full Access</span>
                      <button
                        type="button"
                        onClick={() => toggleFullAccess(member.id, !!member.has_full_access)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${member.has_full_access ? 'bg-primary' : 'bg-stone-300'}`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${member.has_full_access ? 'translate-x-[18px]' : 'translate-x-1'}`} />
                      </button>
                    </label>
                  )}
                  <button
                    onClick={() => handleRemoveMember(member.id, member.full_name || 'this member')}
                    className="text-sm font-bold text-error hover:bg-error/10 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Restricted access info card */}
      <div className="mt-4 rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs font-bold text-textSecondary uppercase tracking-wide mb-2">Access Levels</p>
        <div className="space-y-1.5 text-xs text-textSecondary">
          <p><span className="font-bold text-primary">Restricted</span> — Can add customers, create quotes, use AI assistant</p>
          <p><span className="font-bold text-primary">Full Access</span> — Can also add/delete products and view all reports</p>
        </div>
      </div>

      {/* Add Member Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-sm rounded-3xl bg-surface p-6 shadow-2xl z-[201]">

            {addedMember ? (
              /* ── Success State ── */
              <div className="flex flex-col items-center text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E5F5E9] text-[#1D9C4A]">
                  <CheckCircle2 size={28} />
                </div>
                <h3 className="text-lg font-extrabold text-textPrimary">{addedMember.name} added!</h3>
                <p className="mt-1 text-sm text-textSecondary leading-relaxed">
                  Share these login details with them. They can log in immediately with restricted access.
                </p>

                <div className="mt-5 w-full rounded-2xl bg-sand p-4 text-left space-y-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-textSecondary">Email</p>
                    <p className="text-sm font-bold text-textPrimary">{addedMember.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-textSecondary">Password</p>
                    <p className="text-sm font-bold text-textPrimary">{addedMember.password}</p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-textSecondary">⚠️ Share this securely. They can change their password after logging in.</p>

                <Button className="mt-5 w-full" onClick={closeModal}>Done</Button>
              </div>
            ) : (
              /* ── Form State ── */
              <>
                <h3 className="text-xl font-extrabold text-textPrimary mb-1">Add Sales Executive</h3>
                <p className="text-xs text-textSecondary mb-5">They'll get restricted access by default. You can upgrade later.</p>

                <form onSubmit={handleAddMember} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-textSecondary">Full Name</label>
                    <input
                      required
                      value={newMemberName}
                      onChange={e => setNewMemberName(e.target.value)}
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-textSecondary">Email Address</label>
                    <input
                      required
                      value={newMemberEmail}
                      onChange={e => setNewMemberEmail(e.target.value)}
                      type="email"
                      placeholder="rahul@example.com"
                      className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-textSecondary">Password</label>
                    <div className="relative">
                      <input
                        required
                        value={newMemberPassword}
                        onChange={e => setNewMemberPassword(e.target.value)}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min. 6 characters"
                        minLength={6}
                        className="h-11 w-full rounded-xl border border-border bg-background px-4 pr-11 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary hover:text-textPrimary"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {addError && <p className="text-xs font-bold text-error bg-error/10 p-3 rounded-xl">{addError}</p>}

                  <Button type="submit" disabled={isAdding} className="mt-2 w-full h-11">
                    {isAdding ? <Loader2 size={18} className="animate-spin" /> : 'Add Member'}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamAccess;
