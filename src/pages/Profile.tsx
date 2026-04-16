import { useAuth } from '@/contexts/AuthContext';
import { useGroupStore } from '@/store/useGroupStore';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LogOut, Moon, Bell, Globe, ChevronRight, Plus, Hash, Crown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Profile = () => {
  const { user, logout } = useAuth();
  const { allGroups, currentGroup } = useGroupStore();
  const navigate = useNavigate();
  const [showDelete, setShowDelete]   = useState(false);
  const [deleting,   setDeleting]     = useState(false);
  const [notifs,     setNotifs]       = useState(true);

  const initials = (name: string) =>
    name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const handleDelete = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      await supabase.from('group_members').delete().eq('user_id', user.uid);
      await supabase.from('profiles').delete().eq('id', user.uid);
      await logout(); navigate('/login');
    } catch (e) { console.error(e); setDeleting(false); }
  };

  return (
    <div className="space-y-5 pb-4">
      <div className="pt-1">
        <h1 className="text-2xl font-extrabold text-slate-800">Profile</h1>
        <p className="text-slate-400 text-sm">Your account & preferences</p>
      </div>

      {/* ── Profile card ── */}
      <div className="rw-card overflow-hidden">
        <div className="h-24 rw-gradient relative">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.5) 1px,transparent 1px)', backgroundSize:'16px 16px' }} />
        </div>
        <div className="px-5 pb-5">
          <div className="flex items-end gap-4 -mt-8 mb-3">
            <div className="w-16 h-16 rounded-2xl rw-gradient border-4 border-white flex items-center justify-center text-xl font-extrabold text-white shadow-xl shadow-indigo-200">
              {initials(user?.displayName ?? '?')}
            </div>
            <div className="pb-1 flex-1 min-w-0">
              <p className="font-extrabold text-slate-800 text-lg truncate">{user?.displayName}</p>
              <p className="text-slate-400 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          {currentGroup && (
            <span className="chip-amber inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold">
              <Crown className="w-3 h-3" />
              {currentGroup.adminId === user?.uid ? 'Admin' : 'Member'} · {currentGroup.name}
            </span>
          )}
        </div>
      </div>

      {/* ── Preferences ── */}
      <div className="space-y-2">
        <p className="rw-section-label px-1">Preferences</p>
        <div className="rw-card divide-y rw-divider">
          {/* Dark mode — always off (light app) */}
          <div className="flex items-center gap-4 px-4 py-4">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center"><Moon className="w-4 h-4 text-slate-500" /></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">Dark Mode</p>
              <p className="text-xs text-slate-400">Always light</p>
            </div>
            <div className="w-11 h-6 bg-slate-200 rounded-full flex items-center px-0.5 cursor-not-allowed">
              <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
            </div>
          </div>

          {/* Notifications */}
          <button onClick={() => setNotifs(n => !n)} className="w-full flex items-center gap-4 px-4 py-4 text-left">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center"><Bell className="w-4 h-4 text-blue-500" /></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">Notifications</p>
              <p className="text-xs text-slate-400">{notifs ? 'Enabled' : 'Disabled'}</p>
            </div>
            <div className={cn('w-11 h-6 rounded-full flex items-center px-0.5 rw-toggle', notifs ? 'rw-gradient justify-end' : 'bg-slate-200 justify-start')}>
              <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
            </div>
          </button>

          {/* Language */}
          <button className="w-full flex items-center gap-4 px-4 py-4 text-left">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center"><Globe className="w-4 h-4 text-emerald-500" /></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">Language</p>
              <p className="text-xs text-slate-400">English</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>

      {/* ── My Rooms ── */}
      {allGroups.length > 0 && (
        <div className="space-y-2">
          <p className="rw-section-label px-1">My Rooms</p>
          <div className="rw-card divide-y rw-divider">
            {allGroups.map(g => (
              <button key={g.id} onClick={() => navigate(`/room/${g.id}`)}
                className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-slate-50 transition-colors">
                <div className="w-9 h-9 rounded-xl rw-gradient flex items-center justify-center font-extrabold text-white text-sm shadow-md shadow-indigo-200">
                  {g.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{g.name}</p>
                  <p className="text-xs text-slate-400">{g.memberUids.length} members</p>
                </div>
                {g.adminId === user?.uid && <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Rooms actions ── */}
      <div className="space-y-2">
        <p className="rw-section-label px-1">Rooms</p>
        <div className="rw-card divide-y rw-divider">
          <button onClick={() => navigate('/onboarding?mode=create')}
            className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-slate-50 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center"><Plus className="w-4 h-4 text-indigo-500" /></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">Create New Room</p>
              <p className="text-xs text-slate-400">Start a shared space</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
          <button onClick={() => navigate('/onboarding?mode=join')}
            className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-slate-50 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center"><Hash className="w-4 h-4 text-emerald-500" /></div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">Join via Code</p>
              <p className="text-xs text-slate-400">Enter an invite code</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>

      {/* ── Account ── */}
      <div className="space-y-2">
        <p className="rw-section-label px-1">Account</p>
        <div className="rw-card divide-y rw-divider">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-slate-50 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center"><LogOut className="w-4 h-4 text-slate-500" /></div>
            <p className="text-sm font-bold text-slate-800">Sign Out</p>
          </button>
          <button onClick={() => setShowDelete(true)}
            className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-red-50 transition-colors">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center"><Trash2 className="w-4 h-4 text-red-400" /></div>
            <p className="text-sm font-bold text-red-500">Remove Account</p>
          </button>
        </div>
      </div>

      {/* ── Delete modal ── */}
      {showDelete && (
        <div className="fixed inset-0 z-50 rw-overlay flex items-end justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg">Remove Account?</h3>
              <p className="text-slate-400 text-sm mt-1">You'll be removed from all rooms. Cannot be undone.</p>
            </div>
            <button onClick={handleDelete} disabled={deleting}
              className="rw-btn w-full bg-red-500 text-white disabled:opacity-50">
              {deleting ? 'Removing…' : 'Yes, Remove'}
            </button>
            <button onClick={() => setShowDelete(false)}
              className="rw-btn rw-btn-outline w-full">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};
