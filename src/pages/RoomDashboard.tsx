import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useGroupStore } from '@/store/useGroupStore';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/finance';
import { getWalletBalance, calculateMemberFinancialSummary } from '@/lib/financialUtils';
import { setMonthlyBudget } from '@/services/db';
import { cn } from '@/lib/utils';
import {
  Wallet, Users, TrendingDown, TrendingUp, PlusCircle,
  ArrowRight, AlertCircle, Receipt, CheckCircle, Loader2
} from 'lucide-react';

const TX_META: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  CONTRIBUTION:         { bg: 'bg-emerald-50',  text: 'text-emerald-600',  icon: TrendingUp },
  WALLET_EXPENSE:       { bg: 'bg-indigo-50',   text: 'text-indigo-600',   icon: Receipt    },
  REIMBURSABLE_EXPENSE: { bg: 'bg-blue-50',     text: 'text-blue-600',     icon: Receipt    },
  SPLIT_EXPENSE:        { bg: 'bg-rose-50',      text: 'text-rose-600',     icon: Users      },
  SETTLEMENT:           { bg: 'bg-emerald-50',  text: 'text-emerald-600',  icon: CheckCircle},
};

export const RoomDashboard = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const {
    currentGroup, allGroups,
    transactions, currentBudget, isLoadingFinances,
    groupMembers, selectedMonthYear, syncFinances
  } = useGroupStore();

  const [budgetInput,  setBudgetInput]  = useState('');
  const [settingBudget, setSettingBudget] = useState(false);

  const group       = allGroups.find(g => g.id === roomId) ?? currentGroup;
  const memberCount = group?.memberUids.length ?? 1;
  const isAdmin     = group?.adminId === user?.uid;

  useEffect(() => { if (group) syncFinances(); }, [group?.id, selectedMonthYear]);

  if (!group) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>;

  const effective = currentBudget
    ? { ...currentBudget, perMemberShare: currentBudget.totalAmount / memberCount }
    : null;

  const walletBal = getWalletBalance(transactions);
  const myF       = user ? calculateMemberFinancialSummary(user.uid, memberCount, transactions, effective ? [effective] : []) : null;
  const recent    = [...transactions].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  const handleSetBudget = async () => {
    if (!budgetInput || !group || !user) return;
    setSettingBudget(true);
    await setMonthlyBudget(group.id, selectedMonthYear, Number(budgetInput), memberCount, user.uid).catch(console.error);
    await syncFinances();
    setBudgetInput(''); setSettingBudget(false);
  };

  return (
    <div className="space-y-4">

      {/* ── Budget banner ── */}
      {!currentBudget && (
        <div className={cn('rounded-2xl border p-4', isAdmin ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100')}>
          {isAdmin ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-800">Set rent for {selectedMonthYear}</p>
                  <p className="text-xs text-amber-600 mt-0.5">Auto-splits equally — ₹{budgetInput ? Math.round(Number(budgetInput)/memberCount).toLocaleString('en-IN') : '–'} × {memberCount} members</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input type="number" value={budgetInput} onChange={e => setBudgetInput(e.target.value)}
                  placeholder="Total rent (₹)" className="rw-input h-10 text-sm" />
                <button onClick={handleSetBudget} disabled={settingBudget || !budgetInput}
                  className="rw-btn rw-btn-primary h-10 px-4 text-xs whitespace-nowrap flex-shrink-0">
                  {settingBudget ? '…' : `÷ ${memberCount}`}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-slate-500">
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm">Waiting for Admin to set rent for {selectedMonthYear}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Balance Card (gradient hero) ── */}
      {effective && (
        <div className="rounded-3xl rw-gradient shadow-xl shadow-indigo-200 overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none opacity-10"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
          <div className="relative p-5">
            <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-3">{selectedMonthYear} · Balance</p>
            <div className="grid grid-cols-3 gap-2">
              {/* Wallet */}
              <div className="bg-white/12 rounded-2xl p-3 border border-white/15">
                <Wallet className="w-3.5 h-3.5 text-indigo-200 mb-1.5" />
                <p className="text-[10px] text-white/60 font-medium">Wallet</p>
                <p className="text-base font-extrabold text-white leading-none mt-0.5">{formatCurrency(walletBal)}</p>
              </div>
              {/* My Share */}
              <div className="bg-white/12 rounded-2xl p-3 border border-white/15">
                <Users className="w-3.5 h-3.5 text-indigo-200 mb-1.5" />
                <p className="text-[10px] text-white/60 font-medium">My Share</p>
                <p className="text-base font-extrabold text-white leading-none mt-0.5">{formatCurrency(effective.perMemberShare)}</p>
              </div>
              {/* Status */}
              {myF && (
                <div className={cn('rounded-2xl p-3 border', myF.pendingContribution > 0 ? 'bg-red-400/20 border-red-300/20' : 'bg-green-400/20 border-green-300/20')}>
                  {myF.pendingContribution > 0
                    ? <TrendingDown className="w-3.5 h-3.5 text-red-200 mb-1.5" />
                    : <TrendingUp   className="w-3.5 h-3.5 text-green-200 mb-1.5" />}
                  <p className="text-[10px] text-white/60 font-medium">Status</p>
                  <p className={cn('text-sm font-extrabold leading-none mt-0.5', myF.pendingContribution > 0 ? 'text-red-200' : 'text-green-200')}>
                    {myF.pendingContribution > 0 ? `Owes ${formatCurrency(myF.pendingContribution)}` : `Ahead`}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-[11px] text-indigo-200/70">
              <span>Total: {formatCurrency(effective.totalAmount)}</span>
              <span>{memberCount} members · equal split</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-2 gap-3">
        <Link to={`/room/${roomId}/add-expense`} className="block">
          <button className="rw-btn rw-btn-primary w-full">
            <PlusCircle className="w-4 h-4" /> Add Expense
          </button>
        </Link>
        <Link to={`/room/${roomId}/wallet`} className="block">
          <button className="rw-btn rw-btn-outline w-full">
            <Wallet className="w-4 h-4 text-indigo-500" /> Contribute
          </button>
        </Link>
      </div>

      {/* ── Members Preview ── */}
      <div className="rw-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
          <p className="text-sm font-extrabold text-slate-800">Members</p>
          <Link to={`/room/${roomId}/members`}
            className="flex items-center gap-1 text-xs text-indigo-500 font-bold">
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="p-4">
          {isLoadingFinances ? (
            <div className="flex gap-3">{[0,1,2].map(i => <div key={i} className="w-10 h-10 rounded-full skeleton" />)}</div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {groupMembers.slice(0, 6).map(m => {
                const f = effective ? calculateMemberFinancialSummary(m.uid, memberCount, transactions, [effective]) : null;
                const settled = f ? Math.abs(f.pendingContribution) < 1 : false;
                return (
                  <div key={m.uid} className="flex flex-col items-center gap-1.5">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 rw-gradient text-white',
                      settled ? 'ring-2 ring-offset-1 ring-emerald-400' : 'ring-2 ring-offset-1 ring-slate-200'
                    )}>
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[9px] text-slate-400 font-semibold truncate w-10 text-center">
                      {m.name.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent Transactions ── */}
      <div className="rw-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
          <p className="text-sm font-extrabold text-slate-800">Recent Transactions</p>
          <Link to={`/room/${roomId}/transactions`}
            className="flex items-center gap-1 text-xs text-indigo-500 font-bold">
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {isLoadingFinances ? (
          <div className="p-4 space-y-3">{[0,1,2].map(i => <div key={i} className="h-12 skeleton" />)}</div>
        ) : recent.length === 0 ? (
          <div className="py-10 text-center">
            <Receipt className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recent.map(t => {
              const meta = TX_META[t.type] ?? TX_META.WALLET_EXPENSE;
              const Icon = meta.icon;
              const paidBy = groupMembers.find(m => m.uid === t.paidBy)?.name ?? 'Someone';
              return (
                <button key={t.id}
                  onClick={() => navigate(`/room/${roomId}/transactions/${t.id}`)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', meta.bg)}>
                    <Icon className={cn('w-4 h-4', meta.text)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{t.description || t.type}</p>
                    <p className="text-xs text-slate-400">{paidBy} · {new Date(t.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</p>
                  </div>
                  <span className={cn('text-sm font-extrabold flex-shrink-0', t.type === 'CONTRIBUTION' ? 'text-emerald-600' : 'text-slate-700')}>
                    {t.type === 'CONTRIBUTION' ? '+' : ''}{formatCurrency(t.amount)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
