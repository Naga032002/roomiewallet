import { useParams, useNavigate } from 'react-router-dom';
import { useGroupStore } from '@/store/useGroupStore';
import { useAuth } from '@/contexts/AuthContext';
import { softDeleteTransaction, fetchGroupMembersDisplayNames } from '@/services/db';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, Trash2, ArrowDownLeft, Users, Receipt, Wallet as WalletIcon, Crown, ArrowUpRight, CheckCircle, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const TYPE_CONFIG: Record<string, { label: string; icon: any; gradient: string; iconColor: string; iconBg: string; emoji: string }> = {
  CONTRIBUTION: {
    label: 'Contribution',
    icon: ArrowDownLeft,
    gradient: 'from-emerald-500 to-emerald-600',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-700',
    emoji: '💰',
  },
  WALLET_EXPENSE: {
    label: 'Wallet Payment',
    icon: WalletIcon,
    gradient: 'from-slate-600 to-slate-700',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-700',
    emoji: '🏦',
  },
  REIMBURSABLE_EXPENSE: {
    label: 'Reimbursable',
    icon: Receipt,
    gradient: 'from-indigo-500 to-indigo-600',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-700',
    emoji: '🧾',
  },
  SPLIT_EXPENSE: {
    label: 'Group Split',
    icon: Users,
    gradient: 'from-rose-500 to-rose-600',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-700',
    emoji: '🍔',
  },
  SETTLEMENT: {
    label: 'Settlement',
    icon: Crown,
    gradient: 'from-amber-500 to-amber-600',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
    emoji: '✅',
  },
};

export const TransactionDetail = () => {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const { transactions, currentGroup, syncFinances } = useGroupStore();
  const { user } = useAuth();
  const [members, setMembers] = useState<{ uid: string; name: string }[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (currentGroup) {
      fetchGroupMembersDisplayNames(currentGroup.id).then(setMembers);
    }
  }, [currentGroup?.id]);

  const transaction = transactions.find(t => t.id === transactionId);

  if (!currentGroup) return null;

  if (!transaction) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto" />
        <p className="text-slate-500">Transaction not found.</p>
        <button onClick={() => navigate('/transactions')} className="text-indigo-600 text-sm font-semibold">
          ← Back to Transactions
        </button>
      </div>
    );
  }

  const cfg = TYPE_CONFIG[transaction.type] ?? TYPE_CONFIG.CONTRIBUTION;
  const Icon = cfg.icon;
  const memberName = (uid?: string | null) =>
    uid ? (members.find(m => m.uid === uid)?.name ?? 'Unknown') : '—';
  const isAdmin = user?.uid === currentGroup.adminId;
  const canDelete = !transaction.isDeleted && (isAdmin || transaction.createdBy === user?.uid);
  const memberCount = currentGroup.memberUids.length;

  const handleDelete = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      await softDeleteTransaction(transaction.id, user.uid);
      await syncFinances();
      navigate(-1);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const details = [
    { label: 'Paid By', value: memberName(transaction.paidBy) },
    { label: 'Month', value: transaction.monthYear },
    { label: 'Date Added', value: new Date(transaction.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
    { label: 'Added By', value: memberName(transaction.createdBy) },
    ...(transaction.type === 'SPLIT_EXPENSE'
      ? [
          { label: 'Total Members', value: `${memberCount} people` },
          { label: 'Per Person', value: formatCurrency(transaction.amount / memberCount) },
        ]
      : []),
    ...(transaction.paidTo ? [{ label: 'Paid To', value: memberName(transaction.paidTo) }] : []),
    ...(transaction.isDeleted
      ? [{ label: 'Deleted On', value: transaction.deletedAt ? new Date(transaction.deletedAt).toLocaleDateString() : '—' }]
      : []),
  ];

  return (
    <div className="max-w-md mx-auto pb-10 space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 text-sm font-medium hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Hero */}
      <div className={cn('rounded-3xl overflow-hidden shadow-lg', transaction.isDeleted && 'opacity-60')}>
        <div className={cn('bg-gradient-to-br p-8 text-white text-center', cfg.gradient)}>
          <div className="text-5xl mb-3">{cfg.emoji}</div>
          <p className="text-white/70 text-xs uppercase tracking-widest font-bold mb-1">{cfg.label}</p>
          <p className="text-4xl font-black">{formatCurrency(transaction.amount)}</p>
          {transaction.description && (
            <p className="text-white/70 text-sm mt-2">{transaction.description}</p>
          )}
        </div>

        {/* Status badge */}
        {transaction.isDeleted && (
          <div className="bg-slate-800 text-white text-center py-2 text-xs font-bold tracking-wide">
            🗑 DELETED
          </div>
        )}
      </div>

      {/* Split visualization for SPLIT_EXPENSE */}
      {transaction.type === 'SPLIT_EXPENSE' && memberCount > 0 && (
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-rose-50 border-b border-rose-100">
            <p className="text-xs font-bold text-rose-700 uppercase tracking-wide">Split Breakdown</p>
          </div>
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-sm text-slate-500">Total Amount</span>
              <span className="font-bold text-slate-900">{formatCurrency(transaction.amount)}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-sm text-slate-500">Split among</span>
              <span className="font-bold text-slate-900">{memberCount} people</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-semibold text-rose-700">Each owes</span>
              <span className="font-black text-rose-700 text-lg">{formatCurrency(transaction.amount / memberCount)}</span>
            </div>
          </div>
          <div className="px-4 pb-3 space-y-1.5">
            {members.map(m => (
              <div key={m.uid} className="flex items-center justify-between py-1.5 px-3 bg-rose-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-rose-200 flex items-center justify-center text-rose-700 font-bold text-xs">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-700">{m.name}</span>
                  {m.uid === transaction.paidBy && (
                    <span className="text-[10px] bg-rose-200 text-rose-700 px-1.5 py-0.5 rounded-full font-bold">paid</span>
                  )}
                </div>
                <span className="text-sm font-bold text-rose-700">₹{(transaction.amount / memberCount).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Details */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {details.map((row, i) => (
          <div key={row.label} className={cn('flex items-center justify-between px-5 py-3.5', i > 0 && 'border-t border-slate-50')}>
            <span className="text-sm text-slate-400">{row.label}</span>
            <span className="text-sm font-bold text-slate-900">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Delete */}
      {canDelete && (
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full h-12 rounded-xl border-2 border-rose-200 text-rose-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-rose-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" /> Delete Transaction
        </button>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="font-bold text-slate-900">Delete this transaction?</h3>
              <p className="text-slate-500 text-sm mt-1">This will be soft-deleted and removed from all calculations.</p>
            </div>
            <button
              className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Yes, Delete'}
            </button>
            <button className="w-full h-11 rounded-xl border border-slate-200 text-slate-600 font-medium" onClick={() => setShowConfirm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
