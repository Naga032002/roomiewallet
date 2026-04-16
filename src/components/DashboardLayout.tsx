import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home,  label: 'Home',    path: '/' },
  { icon: User,  label: 'Profile', path: '/profile' },
];

export const DashboardLayout = () => {
  const location = useLocation();
  return (
    <div className="min-h-screen min-h-dvh bg-background flex flex-col">
      <main className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-md mx-auto w-full px-4 pt-6 page-enter">
          <Outlet />
        </div>
      </main>

      {/* Floating white bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 z-50 rw-bottom-nav">
        <div className="max-w-md mx-auto flex justify-around items-center px-6 pt-3">
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="flex flex-col items-center gap-1 transition-all"
              >
                <div className={cn(
                  'w-12 h-8 rounded-2xl flex items-center justify-center transition-all duration-200',
                  active ? 'rw-gradient shadow-md shadow-indigo-200' : ''
                )}>
                  <item.icon className={cn('w-5 h-5', active ? 'text-white' : 'text-slate-400')} />
                </div>
                <span className={cn(
                  'text-[10px] font-bold',
                  active ? 'text-indigo-600' : 'text-slate-400'
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
