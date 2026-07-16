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

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkOnboarding(session.user.id);
      else setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkOnboarding(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkOnboarding = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', userId)
        .single();
      
      if (profile?.shop_id) {
        const { data: shop } = await supabase
          .from('shops')
          .select('onboarding_completed')
          .eq('id', profile.shop_id)
          .single();
        
        setOnboardingCompleted(shop?.onboarding_completed || false);
      } else {
        setOnboardingCompleted(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        
        {/* Protected Routes */}
        <Route path="/" element={
          onboardingCompleted ? <MobileLayout /> : <Navigate to="/onboarding" replace />
        }>
          <Route index element={<Dashboard />} />
          <Route path="customers" element={<Customers />} />
          <Route path="products" element={<Products />} />
          <Route path="ai" element={<div className="p-4">AI Placeholder</div>} />
          <Route path="more" element={<div className="p-4">More Options Placeholder</div>} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
