import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Wallet, Loader2 } from 'lucide-react';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        {/* Brand logo */}
        <div className="w-14 h-14 rounded-2xl rw-gradient flex items-center justify-center shadow-xl shadow-indigo-200 rotate-3">
          <Wallet className="w-7 h-7 text-white -rotate-3" />
        </div>
        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Loading your rooms…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
