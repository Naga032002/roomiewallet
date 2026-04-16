import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useGroupStore } from '@/store/useGroupStore';
import { createGroup, joinGroupByCode } from '@/services/db';
import { Wallet, LogOut, ArrowLeft, PlusCircle, Users, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Onboarding = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedMode = searchParams.get('mode') as 'create' | 'join' | null;
  const { loadUserGroups } = useGroupStore();

  const [mode, setMode] = useState<'create' | 'join'>(requestedMode || 'create');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (requestedMode) setMode(requestedMode);
  }, [requestedMode]);

  const handleCreate = async () => {
    if (!name.trim()) return setError('Please enter a group name');
    if (!user) return setError('Not logged in');
    setLoading(true);
    setError('');
    try {
      const group = await createGroup(name.trim(), user.uid);
      // Reload all groups so Home screen updates immediately
      await loadUserGroups(user.uid);
      navigate(`/room/${group.id}`);
    } catch (err: any) {
      console.error('Create group error:', err);
      setError(err.message || 'Failed to create group. Check Supabase RLS policies.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!code.trim()) return setError('Please enter an invite code');
    if (!user) return setError('Not logged in');
    setLoading(true);
    setError('');
    try {
      console.log('Joining group with code:', code, 'for user:', user.uid);
      const group = await joinGroupByCode(code.trim(), user.uid);
      if (group) {
        // Reload all groups so Home screen updates immediately
        await loadUserGroups(user.uid);
        navigate(`/room/${group.id}`);
      } else {
        setError('No group found with that code. Check and try again.');
      }
    } catch (err: any) {
      console.error('Join group error:', err);
      setError(err.message || 'Failed to join group.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start p-4">
      {/* Header */}
      <div className="flex justify-between items-center w-full max-w-md mb-8">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900">RoomieWallet</span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      <div className="w-full max-w-md space-y-4">
        {/* Back button if navigated from dashboard */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        {/* Mode Toggle */}
        <div className="grid grid-cols-2 gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
          <button
            onClick={() => { setMode('create'); setError(''); }}
            className={cn(
              'flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all',
              mode === 'create'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <PlusCircle className="w-4 h-4" /> Create Group
          </button>
          <button
            onClick={() => { setMode('join'); setError(''); }}
            className={cn(
              'flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all',
              mode === 'join'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <Users className="w-4 h-4" /> Join Group
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Create Form */}
        {mode === 'create' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div>
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                <PlusCircle className="w-6 h-6 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Create a New Group</h2>
              <p className="text-slate-400 text-sm mt-1">You will be the Admin. Share the invite code with your roommates.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400 uppercase tracking-widest font-bold">Group Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="e.g. Apartment 4B, Our Flat..."
                autoFocus
                className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-medium outline-none focus:border-indigo-400 focus:bg-white transition-colors"
              />
            </div>

            <button
              onClick={handleCreate}
              disabled={loading || !name.trim()}
              className={cn(
                'w-full h-12 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all',
                loading || !name.trim()
                  ? 'bg-indigo-300 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200'
              )}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Group →'}
            </button>
          </div>
        )}

        {/* Join Form */}
        {mode === 'join' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div>
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Join Existing Group</h2>
              <p className="text-slate-400 text-sm mt-1">Ask your Admin for the 6-character invite code.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] text-slate-400 uppercase tracking-widest font-bold">Invite Code</label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6))}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                placeholder="ABC123"
                autoFocus
                className="w-full h-14 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-2xl text-center tracking-[0.4em] uppercase outline-none focus:border-emerald-400 focus:bg-white transition-colors"
                maxLength={6}
              />
              <p className="text-xs text-slate-400 text-center">{code.length}/6 characters</p>
            </div>

            <button
              onClick={handleJoin}
              disabled={loading || code.length < 6}
              className={cn(
                'w-full h-12 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all',
                loading || code.length < 6
                  ? 'bg-emerald-300 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200'
              )}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Joining...</> : 'Join Group →'}
            </button>
          </div>
        )}

        {/* Debug info for user */}
        <p className="text-center text-xs text-slate-400">
          Logged in as <span className="font-semibold">{user?.email}</span>
        </p>
      </div>
    </div>
  );
};
