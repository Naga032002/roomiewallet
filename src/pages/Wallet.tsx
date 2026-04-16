import { useMemo, useState } from 'react';
import { useGroupStore } from '@/store/useGroupStore';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { addTransaction } from '@/services/db';
import { ArrowDownLeft, ArrowUpRight, History, PlusCircle, Wallet as WalletIcon, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Wallet = () => {
  const { transactions, currentGroup, selectedMonthYear, syncFinances, groupMembers, loadingMembers } = useGroupStore();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'contribute' | 'history'>('contribute');
  const [amount, setAmount] = useState('');
  const [contributorUid, setContributorUid] = useState(user?.uid ?? '');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const walletTxs = useMemo(() =>
    transactions
      .filter(t => !t.isDeleted && (t.type === 'CONTRIBUTION' || t.type === 'WALLET_EXPENSE'))
      .sort((a, b) => b.createdAt - a.createdAt),
    [transactions]
  );

  const balance = useMemo(() =>
    walletTxs.reduce((acc, t) => t.type === 'CONTRIBUTION' ? acc + t.amount : acc - t.amount, 0),
    [walletTxs]
  );
  const totalIn = useMemo(() => walletTxs.filter(t => t.type === 'CONTRIBUTION').reduce((a, t) => a + t.amount, 0), [walletTxs]);
  const totalOut = useMemo(() => walletTxs.filter(t => t.type === 'WALLET_EXPENSE').reduce((a, t) => a + t.amount, 0), [walletTxs]);

  const memberName = (uid: string) =>
    groupMembers.find(m => m.uid === uid)?.name ?? uid.substring(0, 8);

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0) return setError('Enter a valid amount');
    if (!contributorUid) return setError('Select who is contributing');
    if (!currentGroup || !user) return;
    setError(''); setSuccess('');
    setIsSubmitting(true);
    try {
      await addTransaction(
        currentGroup.id, 'CONTRIBUTION', num,
        contributorUid, selectedMonthYear,
        note || 'Monthly Contribution', user.uid
      );
      await syncFinances();
      setAmount(''); setNote('');
      setSuccess('✓ Contribution saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentGroup) return null;

  return (
    <div className="max-w-md mx-auto space-y-4 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Wallet</h1>
        <p className="text-slate-400 text-sm">Shared pool · {selectedMonthYear}</p>
      </div>

      {/* Balance Hero */}
      <div className="relative bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-indigo-200 mb-1">
            <WalletIcon className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Group Balance</span>
          </div>
          <div className="text-4xl font-bold tracking-tight mb-4">{formatCurrency(balance)}</div>
          <div className="flex gap-6">
            <div>
              <p className="text-indigo-300 text-[10px] uppercase tracking-wide">Total In</p>
              <p className="text-emerald-300 font-bold text-sm">{formatCurrency(totalIn)}</p>
            </div>
            <div>
              <p className="text-indigo-300 text-[10px] uppercase tracking-wide">Total Out</p>
              <p className="text-rose-300 font-bold text-sm">{formatCurrency(totalOut)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
        {[{ key: 'contribute', icon: PlusCircle, label: 'Contribute' }, { key: 'history', icon: History, label: 'History' }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={cn('flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all',
              activeTab === tab.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600')}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Contribute Tab */}
      {activeTab === 'contribute' && (
        <form onSubmit={handleContribute} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">{error}</div>}
          {success && <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm border border-emerald-200">{success}</div>}

          <div>
            <label className="text-[11px] text-slate-400 uppercase tracking-widest font-bold block mb-1.5">Who is paying?</label>
            {loadingMembers ? (
              <div className="h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center px-3 gap-2 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </div>
            ) : (
              <div className="relative">
                <select value={contributorUid} onChange={e => setContributorUid(e.target.value)}
                  className="w-full h-11 px-3 pr-8 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 outline-none focus:border-indigo-300 appearance-none">
                  {currentGroup.memberUids.map(uid => {
                    const name = groupMembers.find(m => m.uid === uid)?.name ?? uid.substring(0, 8);
                    return (
                      <option key={uid} value={uid}>{name}{uid === user?.uid ? ' (You)' : ''}</option>
                    );
                  })}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            )}
          </div>

          <div>
            <label className="text-[11px] text-slate-400 uppercase tracking-widest font-bold block mb-1.5">Amount (₹)</label>
            <input type="number" inputMode="decimal" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-xl font-bold text-slate-900 outline-none focus:border-indigo-300" />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 uppercase tracking-widest font-bold block mb-1.5">Note (optional)</label>
            <input type="text" placeholder="e.g. April rent share" value={note} onChange={e => setNote(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 outline-none focus:border-indigo-300" />
          </div>

          <button type="submit" disabled={isSubmitting}
            className={cn('w-full h-12 rounded-xl text-white font-bold text-sm transition-all',
              isSubmitting ? 'bg-emerald-300 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-200')}>
            {isSubmitting ? 'Saving...' : '+ Add Contribution'}
          </button>
        </form>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-2">
          {walletTxs.length === 0 ? (
            <div className="text-center py-14 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50">
              <WalletIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No wallet activity yet for {selectedMonthYear}.</p>
            </div>
          ) : walletTxs.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 hover:shadow-sm transition-all">
              <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                t.type === 'CONTRIBUTION' ? 'bg-emerald-100' : 'bg-rose-100')}>
                {t.type === 'CONTRIBUTION'
                  ? <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                  : <ArrowUpRight className="w-5 h-5 text-rose-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">
                  {t.description || (t.type === 'CONTRIBUTION' ? 'Contribution' : 'Wallet Expense')}
                </p>
                <p className="text-xs text-slate-400">{memberName(t.paidBy)} · {new Date(t.createdAt).toLocaleDateString()}</p>
              </div>
              <span className={cn('font-bold text-sm', t.type === 'CONTRIBUTION' ? 'text-emerald-600' : 'text-rose-600')}>
                {t.type === 'CONTRIBUTION' ? '+' : '-'}{formatCurrency(t.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
