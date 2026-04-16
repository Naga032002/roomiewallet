import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useGroupStore } from '@/store/useGroupStore';
import { Plus, Hash, ChevronRight, Wallet, TrendingDown, TrendingUp, Loader2, Users, Home as HomeIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/finance';
import { getWalletBalance, calculateMemberFinancialSummary } from '@/lib/financialUtils';
import { cn } from '@/lib/utils';
import { Group } from '@/types';

const ROOM_COLORS = [
  { from: '#4F46E5', to: '#7C3AED' },
  { from: '#0891B2', to: '#0E7490' },
  { from: '#059669', to: '#047857' },
  { from: '#D97706', to: '#B45309' },
  { from: '#DB2777', to: '#BE185D' },
  { from: '#7C3AED', to: '#6D28D9' },
];

export const Home = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const { allGroups, activeRoomId, loadingGroups } = useGroupStore();
  const lastActive = allGroups.find(g => g.id === activeRoomId) ?? allGroups[0] ?? null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 pb-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-slate-400 text-sm font-medium">{greeting} 👋</p>
          <h1 className="text-2xl font-extrabold text-slate-800 leading-tight">
            {user?.displayName?.split(' ')[0] ?? 'Roomie'}
          </h1>
        </div>
        <div
          className="w-11 h-11 rounded-2xl rw-gradient flex items-center justify-center font-extrabold text-white text-base shadow-lg shadow-indigo-200 cursor-pointer"
          onClick={() => navigate('/profile')}
        >
          {(user?.displayName ?? '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
        </div>
      </div>

      {/* ── Loading ── */}
      {loadingGroups && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      )}

      {/* ── Empty ── */}
      {!loadingGroups && allGroups.length === 0 && (
        <div className="text-center py-12 space-y-6">
          <div className="w-20 h-20 rounded-3xl rw-gradient mx-auto flex items-center justify-center shadow-xl shadow-indigo-200">
            <HomeIcon className="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800">No rooms yet</h2>
            <p className="text-slate-400 text-sm mt-1">Create or join a room to get started</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate('/onboarding?mode=create')}
              className="rw-btn rw-btn-primary flex-1">
              <Plus className="w-4 h-4" /> Create Room
            </button>
            <button onClick={() => navigate('/onboarding?mode=join')}
              className="rw-btn rw-btn-outline flex-1 border-slate-200">
              <Hash className="w-4 h-4" /> Join Room
            </button>
          </div>
        </div>
      )}

      {/* ── Last Active Hero Card ── */}
      {!loadingGroups && lastActive && (
        <HeroCard group={lastActive} userId={user?.uid ?? ''} onClick={() => navigate(`/room/${lastActive.id}`)} />
      )}

      {/* ── My Rooms list ── */}
      {!loadingGroups && allGroups.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="rw-section-label">My Rooms</p>
            <span className="text-xs text-slate-400 font-medium">{allGroups.length} room{allGroups.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-2.5">
            {allGroups.map((g, i) => (
              <RoomRow key={g.id} group={g} colorIdx={i} isActive={g.id === activeRoomId}
                onClick={() => navigate(`/room/${g.id}`)} />
            ))}
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      {!loadingGroups && allGroups.length > 0 && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button onClick={() => navigate('/onboarding?mode=create')}
            className="rw-btn rw-btn-primary flex-1">
            <Plus className="w-4 h-4" /> Create Room
          </button>
          <button onClick={() => navigate('/onboarding?mode=join')}
            className="rw-btn rw-btn-outline flex-1">
            <Hash className="w-4 h-4" /> Join Room
          </button>
        </div>
      )}
    </div>
  );
};

/* ── Hero Card ── */
function HeroCard({ group, userId, onClick }: { group: Group; userId: string; onClick: () => void }) {
  const { transactions, currentBudget, currentGroup } = useGroupStore();
  const isLoaded    = currentGroup?.id === group.id;
  const memberCount = group.memberUids.length;
  const effective   = currentBudget ? { ...currentBudget, perMemberShare: currentBudget.totalAmount / memberCount } : null;
  const wallet      = isLoaded ? getWalletBalance(transactions) : null;
  const myF         = isLoaded && userId && effective
    ? calculateMemberFinancialSummary(userId, memberCount, transactions, [effective]) : null;

  return (
    <button onClick={onClick}
      className="w-full text-left rounded-3xl overflow-hidden rw-gradient shadow-xl shadow-indigo-200 active:scale-[0.98] transition-all relative">

      {/* Subtle dot grid overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      <div className="relative p-5 space-y-4">
        {/* Top row */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Last Active Room</p>
            <h2 className="text-white text-xl font-extrabold mt-0.5 leading-tight">{group.name}</h2>
            <p className="text-indigo-200 text-xs mt-0.5">{memberCount} member{memberCount !== 1 ? 's' : ''}</p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center">
            <HomeIcon className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={<Wallet className="w-3.5 h-3.5 text-indigo-200" />} label="Wallet"
            value={wallet !== null ? formatCurrency(wallet) : '—'} />
          <Stat icon={<Users className="w-3.5 h-3.5 text-indigo-200" />} label="Members"
            value={String(memberCount)} />
          <div className={cn(
            'rounded-2xl p-2.5 border border-white/15',
            myF && myF.pendingContribution > 0 ? 'bg-red-400/20' : 'bg-green-400/20'
          )}>
            {myF && myF.pendingContribution > 0
              ? <TrendingDown className="w-3.5 h-3.5 text-red-200 mb-1" />
              : <TrendingUp   className="w-3.5 h-3.5 text-green-200 mb-1" />}
            <p className="text-[10px] text-white/60 font-medium">My Status</p>
            <p className={cn('text-sm font-extrabold leading-tight', myF && myF.pendingContribution > 0 ? 'text-red-200' : 'text-green-200')}>
              {myF ? (myF.pendingContribution > 0 ? `−${formatCurrency(myF.pendingContribution)}` : `+${formatCurrency(Math.abs(myF.pendingContribution))}`) : '—'}
            </p>
          </div>
        </div>

        {/* Open */}
        <div className="flex items-center justify-end gap-1">
          <span className="text-xs text-indigo-200 font-bold">Open Dashboard</span>
          <ChevronRight className="w-4 h-4 text-indigo-200" />
        </div>
      </div>
    </button>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-2xl p-2.5 border border-white/15">
      {icon}
      <p className="text-[10px] text-white/60 font-medium mt-1">{label}</p>
      <p className="text-sm font-extrabold text-white leading-tight">{value}</p>
    </div>
  );
}

/* ── Room Row ── */
function RoomRow({ group, colorIdx, isActive, onClick }: { group: Group; colorIdx: number; isActive: boolean; onClick: () => void }) {
  const colors = ROOM_COLORS[colorIdx % ROOM_COLORS.length];
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rw-card hover:shadow-indigo-100 hover:shadow-lg active:scale-[0.98] transition-all">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-white text-lg flex-shrink-0 shadow-md"
        style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}>
        {group.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-extrabold text-slate-800 text-sm truncate">{group.name}</p>
          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse" />}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{group.memberUids.length} members</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
    </button>
  );
}
