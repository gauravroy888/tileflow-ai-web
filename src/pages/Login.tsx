import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Grid2X2, Sparkles } from 'lucide-react';

const Login = () => {
  const { t } = useTranslation();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) setError(error.message);
      else setSuccess('Check your email for the confirmation link.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setError(error.message);
    }
    
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // HIGH-05: Use fixed origin, never redirect to arbitrary URL from current location
          redirectTo: `${window.location.origin}/`,
        }
      });
      if (error) setError(error.message);
    } catch (err) {
      console.error(err);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email address first.'); return; }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) setError(error.message);
    else setSuccess('Password reset email sent! Check your inbox.');
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-background px-5 py-10 sm:px-6">
      <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-[#E2ECF3] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-72 w-72 rounded-full bg-[#F3DFD4] blur-3xl" />
      <div className="relative sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-background shadow-[0_14px_30px_rgba(13,45,77,0.2)]"><Grid2X2 size={25} /></div>
        <div className="mt-5 text-center">
          <p className="eyebrow">Showroom sales workspace</p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-primary">{t('app_name')}</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-textSecondary">Organise customers, product samples and follow-ups in one calm workspace.</p>
        </div>
      </div>

      <div className="relative mt-8 sm:mx-auto sm:w-full sm:max-w-sm rounded-2xl border border-border bg-surface px-5 py-6 shadow-[0_18px_45px_rgba(23,33,43,0.08)] sm:px-6">
        <div className="mb-6"><div className="flex items-center gap-2 text-primary"><Sparkles size={17} className="text-accent" /><span className="text-sm font-extrabold">Welcome back</span></div><p className="mt-1 text-xs leading-5 text-textSecondary">Sign in to continue running your showroom.</p></div>
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-error">
            {error}
          </div>
        )}
        {success && <div className="mb-5 rounded-xl border border-[#B9DFCF] bg-[#EDF8F4] p-3 text-sm text-success">{success}</div>}

        <div>
          <Button 
            type="button" 
            variant="outline" 
            className="flex w-full items-center justify-center gap-2 border-border bg-surface py-3 text-textPrimary hover:bg-sand"
            onClick={handleGoogleLogin}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t('login.sign_in_google')}
          </Button>
        </div>

        <div className="mt-6 mb-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm font-medium leading-6">
              <span className="bg-surface px-4 text-xs font-bold uppercase tracking-[0.12em] text-textSecondary">Or continue with email</span>
            </div>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleAuth}>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium leading-6 text-textPrimary"
            >
              {t('login.email')}
            </label>
            <div className="mt-2">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block min-h-[48px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-textPrimary shadow-sm outline-none placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/15 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium leading-6 text-textPrimary"
              >
                {t('login.password')}
              </label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(true); setError(null); setSuccess(null); }}
                  className="text-xs font-semibold text-primary hover:text-primary/80"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                minLength={isSignUp ? 6 : undefined}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? 'At least 6 characters' : ''}
                className="block min-h-[48px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-textPrimary shadow-sm outline-none placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/15 sm:text-sm"
              />
              {isSignUp && <p className="mt-1 text-xs text-textSecondary">Password must be at least 6 characters long.</p>}
            </div>
          </div>

          <div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? t('login.signing_in') : (isSignUp ? t('login.create_account') : <>{t('login.sign_in')} <ArrowRight size={17} /></>)}
            </Button>
          </div>
        </form>

        <p className="mt-8 text-center text-sm text-textSecondary">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button 
            onClick={() => setIsSignUp(!isSignUp)} 
            className="font-semibold leading-6 text-primary hover:text-primary/80"
          >
            {isSignUp ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </div>

      {isForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-xl">
            <h3 className="text-lg font-extrabold text-textPrimary">Reset Password</h3>
            <p className="mt-1 text-sm text-textSecondary">Enter your email and we'll send you a reset link.</p>
            <form onSubmit={handleForgotPassword} className="mt-5 space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="block min-h-[48px] w-full rounded-xl border border-border bg-background px-3 py-2.5 text-textPrimary outline-none placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/15 sm:text-sm"
              />
              {error && <p className="text-xs text-error">{error}</p>}
              {success && <p className="text-xs text-success">{success}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => { setIsForgotPassword(false); setError(null); setSuccess(null); }} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-bold text-textSecondary hover:bg-sand">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:bg-primaryHover disabled:opacity-60">{loading ? 'Sending...' : 'Send Reset Link'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
