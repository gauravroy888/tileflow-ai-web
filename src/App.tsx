import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

import MobileLayout from './components/layout/MobileLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Onboarding from './pages/Onboarding';
import AI from './pages/AI';
import More from './pages/More';
import QuoteBuilder from './pages/QuoteBuilder';
import { RetailProfileProvider, useRetailProfile } from './components/providers/RetailProfileProvider';
import { useOfflineStatus } from './hooks/useOfflineStatus';

import Settings from './pages/Settings';
import TeamAccess from './pages/settings/TeamAccess';
import Language from './pages/settings/Language';
import Privacy from './pages/settings/Privacy';
import HelpCentre from './pages/HelpCentre';
import AcceptInvite from './pages/AcceptInvite';

function AuthenticatedRoutes() {
  const { shop, loading, refreshProfile } = useRetailProfile();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-textSecondary">Loading Workspace...</p>
      </div>
    );
  }

  const onboardingCompleted = shop?.onboarding_completed || false;

  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding onComplete={refreshProfile} />} />
      
      {/* Protected Routes */}
      <Route path="/" element={
        onboardingCompleted ? <MobileLayout /> : <Navigate to="/onboarding" replace />
      }>
        <Route index element={<Dashboard />} />
        <Route path="customers" element={<Customers />} />
        <Route path="products" element={<Products />} />
        <Route path="ai" element={<AI />} />
        <Route path="quotes/new" element={<QuoteBuilder />} />
        <Route path="more" element={<More />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/team" element={<TeamAccess />} />
        <Route path="settings/language" element={<Language />} />
        <Route path="settings/privacy" element={<Privacy />} />
        <Route path="help" element={<HelpCentre />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const isOffline = useOfflineStatus();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-textSecondary">Loading RetailFlow AI...</p>
      </div>
    );
  }

  // Always allow the accept-invite route — the user arrives from a magic link
  // and may or may not have an active session yet when the page first loads.
  if (typeof window !== 'undefined' && window.location.pathname.includes('/accept-invite')) {
    return (
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route path="*" element={<AcceptInvite />} />
        </Routes>
      </BrowserRouter>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-500 text-white text-center text-xs font-bold py-1.5 shadow-md flex justify-center items-center gap-2">
          <span>You are currently offline. Some features may be unavailable.</span>
        </div>
      )}
      <RetailProfileProvider userId={session.user.id}>
        <AuthenticatedRoutes />
      </RetailProfileProvider>
    </BrowserRouter>
  );
}

export default App;
