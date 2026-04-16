import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Wallet, Loader2 } from 'lucide-react';
import { useState } from 'react';

export const Login = () => {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();

  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [isLogin,       setIsLogin]       = useState(true);
  const [error,         setError]         = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading,  setEmailLoading]  = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setEmailLoading(true);
    try {
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password, email.split('@')[0]);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally { setEmailLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* ── Brand ── */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rw-gradient rounded-3xl flex items-center justify-center mb-4 shadow-xl shadow-indigo-200 rotate-3">
            <Wallet className="w-8 h-8 text-white -rotate-3" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">RoomieWallet</h1>
          <p className="text-slate-400 mt-2 text-center text-sm leading-relaxed">
            Split rent & expenses with your<br />roommates — effortlessly.
          </p>
        </div>

        {/* ── Card ── */}
        <div className="rw-card p-6 space-y-5">
          {/* Toggle */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
            {['Sign In', 'Sign Up'].map((label, i) => (
              <button key={label} type="button"
                onClick={() => { setIsLogin(i === 0); setError(''); }}
                className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                  (isLogin ? i === 0 : i === 1)
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email address" required className="rw-input" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Password" required className="rw-input" />
            {error && (
              <p className="text-sm text-red-500 font-medium bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
            )}
            <button type="submit" disabled={emailLoading}
              className="rw-btn rw-btn-primary w-full">
              {emailLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {emailLoading ? 'Please wait…' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs text-slate-400 font-medium">or continue with</span>
            </div>
          </div>

          {/* Google */}
          <button type="button" disabled={googleLoading}
            onClick={async () => {
              setError(''); setGoogleLoading(true);
              try { await signInWithGoogle(); }
              catch (err: any) { setError(err.message || 'Google sign-in failed'); setGoogleLoading(false); }
            }}
            className="rw-btn rw-btn-outline w-full border-slate-200 gap-3">
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span className="text-sm font-bold text-slate-700">
              {googleLoading ? 'Redirecting…' : 'Continue with Google'}
            </span>
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          By continuing, you agree to our{' '}
          <span className="text-indigo-500 font-semibold cursor-pointer">Terms</span> &{' '}
          <span className="text-indigo-500 font-semibold cursor-pointer">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
};
