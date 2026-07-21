import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Grid2X2, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

/**
 * AcceptInvite page — handles the magic link flow for invited sales executives.
 *
 * When an owner generates an invite link via the add-member edge function,
 * Supabase sends a magic link of type "invite". When the new user clicks it,
 * Supabase processes the token and fires an onAuthStateChange event with
 * event = "USER_UPDATED". At that point:
 *  - The user is already signed in
 *  - Their profile row was created by handle_new_user() with the correct shop_id
 *    (because invited_shop_id is stored in raw_user_meta_data)
 *  - They just need to set a password and be redirected to the main app
 */
const AcceptInvite = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'set_password' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Supabase has already exchanged the invite token by the time the app loads.
    // We just check if the user is logged in and needs to set a password.
    const checkInviteSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        setStatus('error');
        setErrorMessage('This invite link is invalid or has already been used. Please ask your workspace owner for a new link.');
        return;
      }

      const user = session.user;

      // Check user has a profile linked to a shop (set by handle_new_user trigger)
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id, full_name, role')
        .eq('id', user.id)
        .single();

      if (!profile?.shop_id) {
        setStatus('error');
        setErrorMessage('Could not find your workspace. Please contact the owner who invited you.');
        return;
      }

      setUserName(profile.full_name || user.email || '');
      setStatus('set_password');
    };

    checkInviteSession();
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    setStatus('success');
    // Give user 2 seconds to read the success message, then go to dashboard
    setTimeout(() => navigate('/'), 2000);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-primary" />
          <p className="text-sm font-semibold text-textSecondary">Verifying your invite...</p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-7 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error/10 text-error">
            <ShieldCheck size={26} />
          </div>
          <h2 className="text-lg font-extrabold text-textPrimary">Invite link problem</h2>
          <p className="mt-2 text-sm leading-6 text-textSecondary">{errorMessage}</p>
          <Button className="mt-6 w-full" onClick={() => navigate('/')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-5">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-7 shadow-lg text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E5F5E9] text-[#1D9C4A]">
            <CheckCircle2 size={28} />
          </div>
          <h2 className="text-lg font-extrabold text-textPrimary">You're all set!</h2>
          <p className="mt-2 text-sm leading-6 text-textSecondary">
            Welcome to RetailFlow. Taking you to your workspace now...
          </p>
        </div>
      </div>
    );
  }

  // ── Set Password ──────────────────────────────────────────────────────────
  return (
    <div className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-background px-5 py-10">
      <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-[#E2ECF3] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-72 w-72 rounded-full bg-[#F3DFD4] blur-3xl" />

      <div className="relative sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-background shadow-[0_14px_30px_rgba(13,45,77,0.2)]">
          <Grid2X2 size={25} />
        </div>
        <div className="mt-5 text-center">
          <p className="eyebrow">You've been invited</p>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-primary">Join RetailFlow</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-textSecondary">
            {userName ? `Welcome, ${userName}!` : 'Welcome!'} Set a password to activate your account.
          </p>
        </div>
      </div>

      <div className="relative mt-8 sm:mx-auto sm:w-full sm:max-w-sm rounded-2xl border border-border bg-surface px-5 py-6 shadow-[0_18px_45px_rgba(23,33,43,0.08)]">
        <form className="space-y-5" onSubmit={handleSetPassword}>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-textPrimary mb-1.5">
              New Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="block min-h-[48px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-textPrimary shadow-sm outline-none placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/15 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-semibold text-textPrimary mb-1.5">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              className="block min-h-[48px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-textPrimary shadow-sm outline-none placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/15 sm:text-sm"
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-error">
              {errorMessage}
            </div>
          )}

          <Button type="submit" className="w-full gap-2" disabled={saving}>
            {saving ? <Loader2 size={17} className="animate-spin" /> : 'Activate My Account'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AcceptInvite;
