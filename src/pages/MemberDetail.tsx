import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroupStore } from '@/store/useGroupStore';
import { useAuth } from '@/contexts/AuthContext';
import { fetchGroupMembersDisplayNames } from '@/services/db';
import { calculateMemberFinancialSummary } from '@/lib/financialUtils';
import { formatCurrency } from '@/lib/finance';
import { ArrowLeft, Crown, CheckCircle, TrendingDown, TrendingUp, ArrowDownLeft, ArrowUpRight, Receipt, Users, Wallet, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

type TxFilter = 'ALL' | 'CONTRIBUTION' | 'SPLIT_EXPENSE' | 'REIMBURSABLE_EXPENSE' | 'WALLET_EXPENSE';

export const MemberDetail = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const { currentGroup, transactions, currentBudget, selectedMonthYear } = useGroupStore();
  const { user } = useAuth();
  const [members, setMembers] = useState<{ uid: string; name: string }[]>([]);
  const [txFilter, setTxFilter] = useState<TxFilter>('ALL');

  useEffect(() => {
    if (currentGroup) {
      fetchGroupMembersDisplayNames(currentGroup.id).then(setMembers).catch(console.error);
    }
  }, [currentGroup]);

  if (!currentGroup || !memberId) return null;

  const member = members.find(m => m.uid === memberId);
  const isAdminMember = memberId === currentGroup.adminId;
  const isYou = memberId === user?.uid;
  const budgets = currentBudget ? [currentBudget] : [];
  const memberCount = currentGroup.memberUids.length;
  const financials = calculateMemberFinancialSummary(memberId, memberCount, transactions, budgets);

  const allMemberTxs = transactions.filter(t =>
    !t.isDeleted && (t.paidBy === memberId || t.type === 'SPLIT_EXPENSE')
  ).sort((a, b) => b.createdAt - a.createdAt);

  const filteredTxs = txFilter === 'ALL'
    ? allMemberTxs
    : allMemberTxs.filter(t => t.type === txFilter);

  const isSettled = Math.abs(financials.pendingContribution) < 1;
  const owes = financials.pendingContribution > 0;

  const getIcon = (type: string) => {
    if (type === 'CONTRIBUTION') return <ArrowDownLeft className="w-4 h-4 text-emerald-600" />;
    if (type === 'SPLIT_EXPENSE') return <Users className="w-4 h-4 text-rose-600" />;
    if (type === 'REIMBURSABLE_EXPENSE') return <Receipt className="w-4 h-4 text-indigo-600" />;
    if (type === 'WALLET_EXPENSE') return <Wallet className="w-4 h-4 text-slate-600" />;
    return <ArrowUpRight className="w-4 h-4 text-slate-600" />;
  };

  const getIconBg = (type: string) => {
    if (type === 'CONTRIBUTION') return 'bg-emerald-50';
    if (type === 'SPLIT_EXPENSE') return 'bg-rose-50';
    if (type === 'REIMBURSABLE_EXPENSE') return 'bg-indigo-50';
    return 'bg-slate-50';
  };

  const TX_FILTERS: { label: string; value: TxFilter }[] = [
    { label: 'All', value: 'ALL' },
    { label: '💰 Contributions', value: 'CONTRIBUTION' },
    { label: '🍔 Splits', value: 'SPLIT_EXPENSE' },
    { label: '🧾 Reimburse', value: 'REIMBURSABLE_EXPENSE' },
  ];

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-10">
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 text-sm font-semibold hover:text-slate-800 transition-colors mb-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className={cn('h-16', isAdminMember ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-indigo-500 to-indigo-600')} />
        <div className="px-5 pb-5">
          <div className="flex items-end gap-3 -mt-7 mb-3">
            <div className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold border-4 border-white shadow-md flex-shrink-0',
              isAdminMember ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
            )}>
              {member?.name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div className="pb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">{member?.name ?? '...'}</h2>
                <span className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border',
                  isAdminMember ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                )}>
                  {isAdminMember ? <><Crown className="w-2.5 h-2.5" /> Admin</> : <><UserRound className="w-2.5 h-2.5" /> Member</>}
                </span>
                {isYou && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-600 border border-indigo-200">You</span>}
              </div>
              <p className="text-slate-400 text-xs">{selectedMonthYear} · {currentGroup.name}</p>
            </div>
          </div>

          {/* Status Banner */}
          <div className={cn(
            'flex items-center gap-3 p-3 rounded-xl',
            isSettled ? 'bg-emerald-50 border border-emerald-100' : owes ? 'bg-rose-50 border border-rose-100' : 'bg-emerald-50 border border-emerald-100'
          )}>
            {isSettled ? <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              : owes ? <TrendingDown className="w-5 h-5 text-rose-500 flex-shrink-0" />
              : <TrendingUp className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
            <div>
              <p className={cn('font-bold text-sm', isSettled ? 'text-emerald-800' : owes ? 'text-rose-800' : 'text-emerald-800')}>
                {isSettled ? 'All settled up!'
                  : owes ? `Owes ${formatCurrency(financials.pendingContribution)}`
                  : `Ahead by ${formatCurrency(Math.abs(financials.pendingContribution))}`}
              </p>
              <p className="text-xs text-slate-400">Net balance · {selectedMonthYear}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Contributed', value: financials.totalContributed, color: 'text-emerald-600' },
          { label: 'Rent Share', value: currentBudget?.perMemberShare ?? 0, color: 'text-slate-700' },
          { label: 'Still Pending', value: Math.max(0, financials.pendingContribution), color: 'text-rose-600' },
          { label: 'To Reimburse', value: financials.totalToBeReimbursed, color: 'text-indigo-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{stat.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${stat.color}`}>{formatCurrency(stat.value)}</p>
          </div>
        ))}
      </div>

      {/* Contribution Progress */}
      {currentBudget && currentBudget.perMemberShare > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex justify-between text-xs text-slate-500 mb-2">
            <span>Rent contribution progress</span>
            <span className="font-semibold">{Math.min(100, Math.round((financials.totalContributed / currentBudget.perMemberShare) * 100))}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', isSettled ? 'bg-emerald-500' : 'bg-indigo-500')}
              style={{ width: `${Math.min(100, (financials.totalContributed / currentBudget.perMemberShare) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
            <span>₹{financials.totalContributed.toFixed(0)} paid</span>
            <span>₹{currentBudget.perMemberShare.toFixed(0)} due</span>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Transaction History</h3>
          <span className="text-xs text-slate-400">{filteredTxs.length} records</span>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TX_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setTxFilter(f.value)}
              className={cn(
                'px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap border transition-all flex-shrink-0',
                txFilter === f.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-500 border-slate-200'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filteredTxs.length === 0 ? (
          <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No transactions found.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTxs.map(t => (
              <div
                key={t.id}
                onClick={() => navigate(-1)}
                className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${getIconBg(t.type)}`}>
                  {getIcon(t.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{t.description || t.type}</p>
                  <p className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={cn(
                  'font-bold text-sm',
                  t.type === 'CONTRIBUTION' ? 'text-emerald-600' : 'text-slate-800'
                )}>
                  {t.type === 'CONTRIBUTION' ? '+' : ''}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
