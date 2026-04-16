import { Link, Outlet, useLocation, useParams, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ArrowLeftRight, Wallet, ArrowLeft, Settings, Copy, Check, Pencil, Trash2, DollarSign, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGroupStore } from '@/store/useGroupStore';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { updateGroup, setMonthlyBudget, deleteGroup } from '@/services/db';

const TABS = [
  { icon: LayoutDashboard, label: 'Dashboard', slug: '' },
  { icon: Users,           label: 'Members',   slug: 'members' },
  { icon: ArrowLeftRight,  label: 'History',    slug: 'transactions' },
  { icon: Wallet,          label: 'Wallet',     slug: 'wallet' },
];

export const RoomLayout = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location   = useLocation();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const { allGroups, setActiveRoom, currentGroup, selectedMonthYear, setSelectedMonthYear, syncFinances } = useGroupStore();

  const [sheet,     setSheet]     = useState(false);
  const [mode,      setMode]      = useState<'menu'|'name'|'rent'|'delete'>('menu');
  const [editName,  setEditName]  = useState('');
  const [rentInput, setRentInput] = useState('');
  const [saving,    setSaving]    = useState(false);
  const [copied,    setCopied]    = useState(false);

  useEffect(() => { if (roomId) setActiveRoom(roomId); }, [roomId]);

  const group   = allGroups.find(g => g.id === roomId) ?? currentGroup;
  const isAdmin = group?.adminId === user?.uid;

  const tabPath   = (slug: string) => slug === '' ? `/room/${roomId}` : `/room/${roomId}/${slug}`;
  const tabActive = (slug: string) => slug === '' ? location.pathname === tabPath('') : location.pathname.startsWith(tabPath(slug));

  const copyCode = () => {
    if (!group) return;
    navigator.clipboard.writeText(group.inviteCode);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const saveName = async () => {
    if (!group || !editName.trim()) return;
    setSaving(true);
    await updateGroup(group.id, editName.trim()).catch(console.error);
    if (user) await useGroupStore.getState().loadUserGroups(user.uid);
    setSaving(false); setMode('menu'); setSheet(false);
  };

  const saveRent = async () => {
    if (!group || !rentInput || !user) return;
    setSaving(true);
    await setMonthlyBudget(group.id, selectedMonthYear, Number(rentInput), group.memberUids.length, user.uid).catch(console.error);
    await syncFinances();
    setSaving(false); setRentInput(''); setMode('menu'); setSheet(false);
  };

  const doDelete = async () => {
    if (!group) return;
    setSaving(true);
    await deleteGroup(group.id).catch(console.error);
    if (user) await useGroupStore.getState().loadUserGroups(user.uid);
    navigate('/');
  };

  return (
    <div className="min-h-screen min-h-dvh bg-background flex flex-col">

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm shadow-slate-100/80">
        <div className="max-w-md mx-auto flex items-center gap-3 px-4 py-3">
          <Link to="/"
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center shadow-sm active:scale-95 transition-transform flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-slate-500" />
          </Link>

          <div className="flex-1 min-w-0">
            <h1 className="font-extrabold text-slate-800 text-base leading-tight truncate">{group?.name ?? '…'}</h1>
            <div className="flex items-center gap-1 mt-0.5">
              <input
                type="month"
                value={selectedMonthYear}
                onChange={e => setSelectedMonthYear(e.target.value)}
                className="bg-transparent text-slate-400 text-xs font-semibold outline-none cursor-pointer"
              />
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
          </div>

          {isAdmin && (
            <button onClick={() => { setSheet(true); setMode('menu'); }}
              className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center shadow-sm active:scale-95 transition-transform flex-shrink-0">
              <Settings className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      </header>

      {/* ── Content ── */}
      <main className="flex-1 overflow-y-auto pb-28">
        <div className="max-w-md mx-auto w-full px-4 py-4 page-enter">
          <Outlet />
        </div>
      </main>

      {/* ── Inner 4-tab nav ── */}
      <nav className="fixed bottom-0 inset-x-0 z-50 rw-bottom-nav">
        <div className="max-w-md mx-auto flex justify-around items-center px-2 pt-3">
          {TABS.map(tab => {
            const active = tabActive(tab.slug);
            return (
              <Link key={tab.slug} to={tabPath(tab.slug)}
                className="flex flex-col items-center gap-1 flex-1 transition-all">
                <div className={cn(
                  'w-11 h-8 rounded-2xl flex items-center justify-center transition-all duration-200',
                  active ? 'rw-gradient shadow-md shadow-indigo-200' : ''
                )}>
                  <tab.icon className={cn('w-4 h-4', active ? 'text-white' : 'text-slate-400')} />
                </div>
                <span className={cn('text-[9px] font-bold', active ? 'text-indigo-600' : 'text-slate-400')}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Admin Bottom Sheet ── */}
      {sheet && (
        <div className="fixed inset-0 z-50 rw-overlay flex items-end justify-center"
             onClick={() => { setSheet(false); setMode('menu'); }}>
          <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl p-6 pb-10 space-y-3"
               onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />

            {mode === 'menu' && (<>
              <p className="rw-section-label mb-3">Room Settings</p>

              {/* Copy code */}
              <button onClick={copyCode}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-slate-400" />}
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-slate-800">Invite Code</p>
                  <p className="text-xs text-slate-400 font-mono tracking-widest">{group?.inviteCode}</p>
                </div>
                {copied && <span className="text-xs text-emerald-600 font-bold">Copied!</span>}
              </button>

              {/* Edit name */}
              <button onClick={() => { setMode('name'); setEditName(group?.name ?? ''); }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                <Pencil className="w-5 h-5 text-slate-400" />
                <p className="text-sm font-bold text-slate-800">Edit Room Name</p>
              </button>

              {/* Update rent */}
              <button onClick={() => setMode('rent')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors">
                <DollarSign className="w-5 h-5 text-slate-400" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-slate-800">Update Monthly Rent</p>
                  <p className="text-xs text-slate-400">Auto-split ÷ {group?.memberUids.length} members</p>
                </div>
              </button>

              {/* Delete */}
              <button onClick={() => setMode('delete')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-50 border border-red-100 hover:bg-red-100 transition-colors">
                <Trash2 className="w-5 h-5 text-red-400" />
                <p className="text-sm font-bold text-red-500">Delete Room</p>
              </button>
            </>)}

            {mode === 'name' && (<>
              <button onClick={() => setMode('menu')} className="text-sm text-slate-400 flex items-center gap-1 mb-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <p className="font-extrabold text-slate-800 text-base mb-3">Edit Room Name</p>
              <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                placeholder="Room name…" className="rw-input mb-3" />
              <button onClick={saveName} disabled={saving || !editName.trim()}
                className="rw-btn rw-btn-primary w-full">
                {saving ? 'Saving…' : 'Save Name'}
              </button>
            </>)}

            {mode === 'rent' && (<>
              <button onClick={() => setMode('menu')} className="text-sm text-slate-400 flex items-center gap-1 mb-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <p className="font-extrabold text-slate-800 text-base">Update Monthly Rent</p>
              <p className="text-xs text-slate-400 mb-3">
                Auto-split: ₹{rentInput ? Math.round(Number(rentInput)/(group?.memberUids.length??1)).toLocaleString('en-IN') : '–'} × {group?.memberUids.length} members
              </p>
              <input autoFocus type="number" value={rentInput} onChange={e => setRentInput(e.target.value)}
                placeholder="Total rent (₹)" className="rw-input mb-3" />
              <button onClick={saveRent} disabled={saving || !rentInput}
                className="rw-btn rw-btn-primary w-full">
                {saving ? 'Saving…' : `Set Rent & Split Equally`}
              </button>
            </>)}

            {mode === 'delete' && (<>
              <div className="text-center py-2">
                <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-3">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <p className="font-extrabold text-slate-800 text-lg">Delete "{group?.name}"?</p>
                <p className="text-sm text-slate-400 mt-1">All data will be permanently removed.</p>
              </div>
              <button onClick={doDelete} disabled={saving}
                className="rw-btn w-full bg-red-500 hover:bg-red-600 text-white disabled:opacity-50">
                {saving ? 'Deleting…' : 'Yes, Delete Room'}
              </button>
              <button onClick={() => setMode('menu')}
                className="rw-btn rw-btn-outline w-full">Cancel</button>
            </>)}
          </div>
        </div>
      )}
    </div>
  );
};
