import { useState, useEffect } from 'react';
import { useGroupStore } from '@/store/useGroupStore';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { ArrowDownLeft, ArrowUpRight, Receipt, Users, Wallet as WalletIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { fetchGroupMembersDisplayNames } from '@/services/db';

export const Ledger = () => {
  const { currentGroup, selectedMonthYear, transactions } = useGroupStore();
  const navigate = useNavigate();
  const [members, setMembers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (currentGroup) {
      fetchGroupMembersDisplayNames(currentGroup.id).then(data => {
        const map: Record<string, string> = {};
        data.forEach(m => { map[m.uid] = m.name; });
        setMembers(map);
      });
    }
  }, [currentGroup]);

  if (!currentGroup) return null;

  const getTypeBadge = (type: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      CONTRIBUTION: { label: 'Contribution', color: 'bg-emerald-100 text-emerald-800' },
      WALLET_EXPENSE: { label: 'Wallet Pay', color: 'bg-slate-100 text-slate-800' },
      REIMBURSABLE_EXPENSE: { label: 'OOP Reimburse', color: 'bg-indigo-100 text-indigo-800' },
      SPLIT_EXPENSE: { label: 'Group Split', color: 'bg-rose-100 text-rose-800' },
      SETTLEMENT: { label: 'Settlement', color: 'bg-amber-100 text-amber-800' },
    };
    const c = configs[type] ?? { label: type, color: 'bg-slate-100 text-slate-800' };
    return <Badge className={`${c.color} border-0`}>{c.label}</Badge>;
  };

  const getIcon = (type: string) => {
    if (type === 'CONTRIBUTION') return <ArrowDownLeft className="w-4 h-4 text-emerald-600" />;
    if (type === 'SPLIT_EXPENSE') return <Users className="w-4 h-4 text-rose-600" />;
    if (type === 'REIMBURSABLE_EXPENSE') return <Receipt className="w-4 h-4 text-indigo-600" />;
    if (type === 'WALLET_EXPENSE') return <WalletIcon className="w-4 h-4 text-slate-600" />;
    return <ArrowUpRight className="w-4 h-4 text-slate-600" />;
  };

  const getIconBg = (type: string) => {
    if (type === 'CONTRIBUTION') return 'bg-emerald-50';
    if (type === 'SPLIT_EXPENSE') return 'bg-rose-50';
    if (type === 'REIMBURSABLE_EXPENSE') return 'bg-indigo-50';
    return 'bg-slate-50';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Transaction Ledger</h1>
        <p className="text-slate-500">All activity for {selectedMonthYear}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>Click any row to view full details</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No transactions for {selectedMonthYear}.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map(t => (
                <div
                  key={t.id}
                  onClick={() => navigate(`/transactions/${t.id}`)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer group ${t.isDeleted ? 'opacity-40' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getIconBg(t.type)}`}>
                    {getIcon(t.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 truncate">{t.description || t.type}</p>
                      {getTypeBadge(t.type)}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{members[t.paidBy] ?? '—'} · {new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-bold ${t.type === 'CONTRIBUTION' ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {formatCurrency(t.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
