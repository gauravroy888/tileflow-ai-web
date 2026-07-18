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

import Settings from './pages/Settings';

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
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (!session) {
    return <Login />;
  }

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <RetailProfileProvider userId={session.user.id}>
        <AuthenticatedRoutes />
      </RetailProfileProvider>
    </BrowserRouter>
  );
}

export default App;
