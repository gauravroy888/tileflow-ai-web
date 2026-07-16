import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

import MobileLayout from './components/layout/MobileLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

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
        <p className="text-textSecondary">Loading TileFlow AI...</p>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MobileLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="customers" element={<div className="p-4">Customers Placeholder</div>} />
          <Route path="products" element={<div className="p-4">Products Placeholder</div>} />
          <Route path="ai" element={<div className="p-4">AI Placeholder</div>} />
          <Route path="more" element={<div className="p-4">More Options Placeholder</div>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
