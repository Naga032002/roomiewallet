import { useMemo } from 'react';
import { useGroupStore } from '@/store/useGroupStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

export const Expenses = () => {
  const { transactions } = useGroupStore();

  const expenseTransactions = useMemo(() => {
    return transactions.filter(t => t.type === 'SPLIT_EXPENSE' || t.type === 'REIMBURSABLE_EXPENSE');
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Expenses</h1>
          <p className="text-slate-500">Track group outlays</p>
        </div>
        <Link to="/add-transaction">
          <Button className="rounded-full shadow-lg h-12 px-6">
            <Plus className="w-5 h-5 mr-2" />
            Add Expense
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Split & Reimbursable Expenses</CardTitle>
          <CardDescription>A list of out-of-pocket expenses paid by individuals for the group</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {expenseTransactions.length === 0 ? (
              <p className="text-slate-500 text-center py-6">No split expenses found.</p>
            ) : (
              expenseTransactions.map(t => (
                <div key={t.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-2xl hover:bg-slate-50 transition-colors gap-4 sm:gap-0 ${t.isDeleted ? 'opacity-50' : ''}`}>
                  <div>
                    <p className="font-semibold text-slate-900">{t.description || 'General Expense'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-500">Recorded on {new Date(t.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-bold text-slate-900">{formatCurrency(t.amount)}</p>
                    <Badge variant="outline" className={`mt-1 font-medium text-[10px] ${t.type === 'SPLIT_EXPENSE' ? 'text-indigo-600' : 'text-amber-600'}`}>
                      {t.type === 'SPLIT_EXPENSE' ? 'Group Split' : 'Reimbursement Owed'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
