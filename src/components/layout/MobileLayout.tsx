
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Users, Grid, Sparkles, Menu } from 'lucide-react';

const MobileLayout = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Products', path: '/products', icon: Grid },
    { name: 'AI', path: '/ai', icon: Sparkles },
    { name: 'More', path: '/more', icon: Menu },
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Bar */}
      <header className="bg-surface px-4 py-3 flex justify-between items-center shadow-sm sticky top-0 z-10 border-b border-border">
        <h1 className="text-xl font-bold text-primary">TileFlow AI</h1>
        {/* Placeholder for Profile/Notifications */}
        <div className="w-8 h-8 rounded-full bg-gray-200"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-16">
        <div className="max-w-screen-xl mx-auto w-full">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-surface fixed bottom-0 w-full border-t border-border flex justify-around items-center h-16 z-10 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-primary' : 'text-textSecondary'
              }`}
            >
              <Icon size={24} className={isActive ? 'text-primary' : ''} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileLayout;
