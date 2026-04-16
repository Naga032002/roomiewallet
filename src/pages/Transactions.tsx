import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroupStore } from '@/store/useGroupStore';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/finance';
import { fetchGroupMembersDisplayNames } from '@/services/db';
import { cn } from '@/lib/utils';
import { Receipt, TrendingUp, Users, Wallet, ArrowDownLeft } from 'lucide-react';

type Filter = 'ALL' | 'CONTRIBUTION' | 'WALLET_EXPENSE' | 'SPLIT_EXPENSE' | 'REIMBURSABLE_EXPENSE';

const FILTERS: { label: string; value: Filter }[] = [
  { label: 'All',           value: 'ALL' },
  { label: '💰 Contributions', value: 'CONTRIBUTION' },
  { label: '🏦 Wallet',     value: 'WALLET_EXPENSE' },
  { label: '🍔 Splits',     value: 'SPLIT_EXPENSE' },
  { label: '🧾 Reimburse',  value: 'REIMBURSABLE_EXPENSE' },
];

const TX_STYLE: Record<string, { bg: string; iconColor: string; icon: React.ElementType; amtColor: string }> = {
  CONTRIBUTION:         { bg: 'bg-emerald-50',  iconColor: 'text-emerald-600', icon: TrendingUp,    amtColor: 'text-emerald-600' },
  WALLET_EXPENSE:       { bg: 'bg-indigo-50',   iconColor: 'text-indigo-600',  icon: Wallet,        amtColor: 'text-slate-800'   },
  REIMBURSABLE_EXPENSE: { bg: 'bg-blue-50',     iconColor: 'text-blue-600',    icon: Receipt,       amtColor: 'text-slate-800'   },
  SPLIT_EXPENSE:        { bg: 'bg-rose-50',     iconColor: 'text-rose-600',    icon: Users,         amtColor: 'text-rose-600'    },
  SETTLEMENT:           { bg: 'bg-emerald-50',  iconColor: 'text-emerald-600', icon: ArrowDownLeft, amtColor: 'text-emerald-600' },
};

export const Transactions = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const { currentGroup, allGroups, selectedMonthYear, transactions } = useGroupStore();

  const group = allGroups.find(g => g.id === roomId) ?? currentGroup;
  const [members, setMembers] = useState<Record<string, string>>({});
  const [filter,  setFilter]  = useState<Filter>('ALL');

  useEffect(() => {
    if (!group) return;
    fetchGroupMembersDisplayNames(group.id).then(data => {
      const map: Record<string, string> = {};
      data.forEach(m => { map[m.uid] = m.name; });
      setMembers(map);
    });
  }, [group?.id]);

  const filtered = transactions.filter(t => !t.isDeleted && (filter === 'ALL' || t.type === filter));

  // Group by date
  const grouped = filtered.reduce<Record<string, typeof filtered>>((acc, t) => {
    const date = new Date(t.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-4 pb-4">
      {/* ── Summary chip ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 font-semibold">{selectedMonthYear} · {filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* ── Filter pills ── */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={cn(
              'px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all border',
              filter === f.value
                ? 'rw-gradient text-white border-transparent shadow-md shadow-indigo-200'
                : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-200 hover:text-indigo-500'
            )}>
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Empty ── */}
      {filtered.length === 0 && (
        <div className="py-14 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
          <Receipt className="w-10 h-10 mx-auto mb-3 text-slate-200" />
          <p className="text-sm text-slate-400">No transactions yet</p>
        </div>
      )}

      {/* ── Grouped list ── */}
      {Object.entries(grouped).map(([date, txs]) => (
        <div key={date} className="space-y-2">
          <p className="text-xs font-bold text-slate-400 px-1">{date}</p>
          <div className="rw-card overflow-hidden">
            <div className="divide-y divide-slate-50">
              {txs.map(t => {
                const style = TX_STYLE[t.type] ?? TX_STYLE.WALLET_EXPENSE;
                const Icon  = style.icon;
                const payer = t.paidBy === user?.uid ? 'You' : (members[t.paidBy] ?? '—');
                return (
                  <button key={t.id}
                    onClick={() => navigate(`/room/${roomId}/transactions/${t.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors text-left">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', style.bg)}>
                      <Icon className={cn('w-4 h-4', style.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{t.description || t.type.replace('_', ' ')}</p>
                      <p className="text-xs text-slate-400">{payer}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={cn('text-sm font-extrabold', style.amtColor)}>
                        {t.type === 'CONTRIBUTION' ? '+' : ''}{formatCurrency(t.amount)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
