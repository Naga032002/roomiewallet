import { useState, useRef } from 'react';
import { useGroupStore } from '@/store/useGroupStore';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { addTransaction } from '@/services/db';
import { TransactionType } from '@/types';
import { Wallet as WalletIcon, CreditCard, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { label: '🍔 Food',       value: 'food' },
  { label: '🏠 Rent',       value: 'rent' },
  { label: '⚡ Utilities',  value: 'utilities' },
  { label: '🎬 Movie',      value: 'entertainment' },
  { label: '🛒 Groceries',  value: 'groceries' },
  { label: '🚗 Transport',  value: 'transport' },
  { label: '📦 Other',      value: 'other' },
];

export const AddTransaction = () => {
  const { roomId }  = useParams<{ roomId: string }>();
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const amountRef   = useRef<HTMLInputElement>(null);
  const { currentGroup, allGroups, selectedMonthYear, syncFinances, groupMembers } = useGroupStore();

  const group = allGroups.find(g => g.id === roomId) ?? currentGroup;

  const [amount,        setAmount]        = useState('');
  const [description,   setDescription]   = useState('');
  const [category,      setCategory]      = useState('other');
  const [paidBy,        setPaidBy]        = useState(user?.uid ?? '');
  const [paymentMethod, setPaymentMethod] = useState<'personal'|'wallet'>('personal');
  const [splitAmong,    setSplitAmong]    = useState<string[]>(group?.memberUids ?? []);
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState('');

  if (!group || !user) { navigate('/'); return null; }

  const isAdmin    = group.adminId === user.uid;
  const numAmount  = parseFloat(amount) || 0;
  const activeSplit = splitAmong.filter(uid => group.memberUids.includes(uid));
  const perPerson   = activeSplit.length > 0 && numAmount > 0
    ? Math.round(numAmount / activeSplit.length) : 0;

  const toggleMember = (uid: string) =>
    setSplitAmong(prev => prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]);

  const memberName = (uid: string) => uid === user.uid ? 'You' : (groupMembers.find(m => m.uid === uid)?.name ?? uid.slice(0, 8));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) return setError('Enter a valid amount');
    setError(''); setSubmitting(true);
    try {
      let type: TransactionType = 'SPLIT_EXPENSE';
      let payer = paidBy;
      if (paymentMethod === 'wallet') { type = 'WALLET_EXPENSE'; payer = group.adminId; }
      const catLabel = CATEGORIES.find(c => c.value === category)?.label ?? '';
      const desc = [catLabel, description].filter(Boolean).join(' · ');
      await addTransaction(group.id, type, numAmount, payer, selectedMonthYear, desc, user.uid);
      await syncFinances();
      navigate(`/room/${roomId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-md mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 pt-1">
        <button type="button" onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-500 active:scale-95 transition-transform">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-extrabold text-slate-800">Add Expense</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* ── Amount hero ── */}
        <div className="rounded-3xl rw-gradient shadow-xl shadow-indigo-200 p-6 text-center relative overflow-hidden cursor-text"
          onClick={() => amountRef.current?.focus()}>
          <div className="absolute inset-0 pointer-events-none opacity-10"
            style={{ backgroundImage:'radial-gradient(circle,rgba(255,255,255,0.5) 1px,transparent 1px)', backgroundSize:'20px 20px' }} />
          <p className="text-indigo-200 text-[11px] font-bold uppercase tracking-widest mb-3">Total Amount</p>
          <div className="flex items-center justify-center gap-1 relative">
            <span className="text-white/70 text-3xl font-light">₹</span>
            <input ref={amountRef} type="number" inputMode="decimal" value={amount}
              onChange={e => setAmount(e.target.value)} placeholder="0" autoFocus
              className="bg-transparent text-white placeholder-indigo-300 text-5xl font-extrabold text-center outline-none w-44"
              style={{ caretColor: 'white' }} />
          </div>
          {numAmount > 0 && activeSplit.length > 0 && paymentMethod === 'personal' && (
            <p className="text-indigo-200 text-sm mt-3">₹{perPerson.toLocaleString('en-IN')} each · {activeSplit.length} people</p>
          )}
        </div>

        {/* Error */}
        {error && <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-600 font-medium">{error}</div>}

        {/* ── Details card ── */}
        <div className="rw-card p-4 space-y-4">
          <div>
            <p className="rw-section-label mb-2">What was this for?</p>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Lunch, Electricity, Rent…" className="rw-input" />
          </div>

          <div>
            <p className="rw-section-label mb-2">Category</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                  className={cn('px-3 py-1.5 rounded-2xl text-xs font-bold border transition-all',
                    category === c.value
                      ? 'rw-gradient text-white border-transparent shadow-md shadow-indigo-200'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200')}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="rw-section-label mb-2">Paid By</p>
            <select value={paidBy} onChange={e => setPaidBy(e.target.value)} className="rw-input">
              {group.memberUids.map(uid => (
                <option key={uid} value={uid}>{memberName(uid)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Payment method ── */}
        <div className="rw-card p-4">
          <p className="rw-section-label mb-3">Payment Method</p>
          <div className="grid grid-cols-2 gap-3">
            <button type="button"
              onClick={() => isAdmin && setPaymentMethod('wallet')}
              className={cn('p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all',
                paymentMethod === 'wallet'
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : isAdmin
                    ? 'border-slate-200 text-slate-500 bg-white hover:border-slate-300'
                    : 'border-slate-100 text-slate-300 bg-slate-50 cursor-not-allowed opacity-40')}>
              <WalletIcon className="w-6 h-6" />
              <div className="text-center">
                <p className="text-xs font-extrabold">Wallet</p>
                <p className="text-[10px] opacity-60">{isAdmin ? 'Group pool' : 'Admin only'}</p>
              </div>
            </button>
            <button type="button" onClick={() => setPaymentMethod('personal')}
              className={cn('p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all',
                paymentMethod === 'personal'
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300')}>
              <CreditCard className="w-6 h-6" />
              <div className="text-center">
                <p className="text-xs font-extrabold">Personal</p>
                <p className="text-[10px] opacity-60">Split among group</p>
              </div>
            </button>
          </div>
        </div>

        {/* ── Split among ── */}
        {paymentMethod === 'personal' && (
          <div className="rw-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="rw-section-label">Split Among</p>
                {numAmount > 0 && activeSplit.length > 0 && (
                  <p className="text-xs text-indigo-600 font-bold mt-0.5">₹{perPerson.toLocaleString('en-IN')} per person</p>
                )}
              </div>
              <button type="button" onClick={() => setSplitAmong([...group.memberUids])}
                className="text-xs text-indigo-600 font-bold px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors">
                All
              </button>
            </div>
            <div className="space-y-2">
              {group.memberUids.map(uid => {
                const checked = splitAmong.includes(uid);
                return (
                  <div key={uid} onClick={() => toggleMember(uid)}
                    className={cn('flex items-center justify-between px-3 py-3 rounded-2xl cursor-pointer border-2 transition-all select-none',
                      checked ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 bg-white hover:bg-slate-50')}>
                    <div className="flex items-center gap-3">
                      <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                        checked ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300')}>
                        {checked && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <span className={cn('text-sm font-bold', checked ? 'text-indigo-800' : 'text-slate-600')}>
                        {memberName(uid)}
                      </span>
                    </div>
                    <span className={cn('text-sm font-extrabold', checked ? 'text-indigo-600' : 'text-slate-300')}>
                      {checked && numAmount > 0 ? `₹${perPerson.toLocaleString('en-IN')}` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Submit ── */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button type="button" onClick={() => navigate(-1)} className="rw-btn rw-btn-outline">Cancel</button>
          <button type="submit" disabled={submitting} className="rw-btn rw-btn-primary">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {submitting ? 'Saving…' : 'Save Expense'}
          </button>
        </div>
      </form>
    </div>
  );
};
