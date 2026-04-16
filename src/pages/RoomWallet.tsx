import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroupStore } from '@/store/useGroupStore';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/finance';
import { getWalletBalance, calculateMemberFinancialSummary } from '@/lib/financialUtils';
import { addTransaction } from '@/services/db';
import { Wallet, PlusCircle, Loader2, TrendingUp, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const RoomWallet = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { user }   = useAuth();
  const { currentGroup, allGroups, transactions, currentBudget, selectedMonthYear, groupMembers, syncFinances } = useGroupStore();

  const group       = allGroups.find(g => g.id === roomId) ?? currentGroup;
  const memberCount = group?.memberUids.length ?? 1;

  const [amount, setAmount] = useState('');
  const [desc,   setDesc]   = useState('');
  const [saving, setSaving] = useState(false);

  const effective   = currentBudget ? { ...currentBudget, perMemberShare: currentBudget.totalAmount / memberCount } : null;
  const walletBal   = getWalletBalance(transactions);
  const contributions = transactions.filter(t => !t.isDeleted && t.type === 'CONTRIBUTION');
  const myF         = user && effective ? calculateMemberFinancialSummary(user.uid, memberCount, transactions, [effective]) : null;

  const handleContribute = async () => {
    if (!amount || !group || !user || Number(amount) <= 0) return;
    setSaving(true);
    await addTransaction(group.id, 'CONTRIBUTION', Number(amount), user.uid, selectedMonthYear, desc || 'Rent contribution', user.uid).catch(console.error);
    await syncFinances();
    setAmount(''); setDesc(''); setSaving(false);
  };

  if (!group) return null;

  return (
    <div className="space-y-4 pb-4">

      {/* ── Hero wallet card ── */}
      <div className="rounded-3xl rw-gradient shadow-xl shadow-indigo-200 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.6) 1px,transparent 1px)', backgroundSize:'18px 18px' }} />
        <div className="relative p-5">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-indigo-200" />
            <span className="text-xs text-indigo-200 font-bold uppercase tracking-widest">Room Wallet</span>
          </div>
          <p className="text-4xl font-extrabold text-white">{formatCurrency(walletBal)}</p>
          <p className="text-indigo-200 text-xs mt-1">{selectedMonthYear} · shared pool</p>

          {effective && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="bg-white/12 rounded-2xl p-3 border border-white/15">
                <p className="text-[10px] text-white/60 font-medium mb-1">Monthly Rent</p>
                <p className="text-base font-extrabold text-white">{formatCurrency(effective.totalAmount)}</p>
              </div>
              <div className="bg-white/12 rounded-2xl p-3 border border-white/15">
                <p className="text-[10px] text-white/60 font-medium mb-1">My Share (÷{memberCount})</p>
                <p className="text-base font-extrabold text-white">{formatCurrency(effective.perMemberShare)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── My status chip ── */}
      {myF && effective && (
        <div className={cn(
          'flex items-center gap-3 p-4 rounded-2xl border',
          myF.pendingContribution <= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
        )}>
          <CheckCircle className={cn('w-5 h-5 flex-shrink-0', myF.pendingContribution <= 0 ? 'text-emerald-500' : 'text-rose-400')} />
          <div>
            <p className={cn('font-bold text-sm', myF.pendingContribution <= 0 ? 'text-emerald-700' : 'text-rose-700')}>
              {myF.pendingContribution <= 0 ? '✓ Fully settled for this month' : `You still owe ${formatCurrency(myF.pendingContribution)}`}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Paid: {formatCurrency(myF.totalContributed)} · Share: {formatCurrency(effective.perMemberShare)}
            </p>
          </div>
        </div>
      )}

      {/* ── Add contribution form ── */}
      <div className="rw-card p-4 space-y-3">
        <p className="text-sm font-extrabold text-slate-800">Add Contribution</p>

        <div className="flex items-center gap-2 h-14 px-4 rounded-2xl bg-slate-50 border-2 border-slate-200 focus-within:border-indigo-400 focus-within:bg-white transition-all">
          <span className="text-slate-400 text-lg font-bold">₹</span>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0"
            className="flex-1 bg-transparent text-slate-800 text-2xl font-extrabold outline-none placeholder:text-slate-300" />
          {effective && (
            <button onClick={() => setAmount(String(Math.round(effective.perMemberShare)))}
              className="text-xs text-indigo-600 font-bold px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors whitespace-nowrap">
              Use Share
            </button>
          )}
        </div>

        <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
          placeholder="Note (optional)"
          className="rw-input h-10 text-sm" />

        <button onClick={handleContribute} disabled={saving || !amount || Number(amount) <= 0}
          className="rw-btn rw-btn-primary w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
          {saving ? 'Saving…' : 'Contribute'}
        </button>
      </div>

      {/* ── Contributions history ── */}
      {contributions.length > 0 && (
        <div className="rw-card overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50">
            <p className="text-sm font-extrabold text-slate-800">This Month's Contributions</p>
          </div>
          <div className="divide-y divide-slate-50">
            {contributions.map(c => {
              const payer = groupMembers.find(m => m.uid === c.paidBy)?.name ?? 'Unknown';
              const isMe  = c.paidBy === user?.uid;
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">{isMe ? 'You' : payer}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                      {c.description && ` · ${c.description}`}
                    </p>
                  </div>
                  <span className="text-emerald-600 font-extrabold text-sm">+{formatCurrency(c.amount)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
