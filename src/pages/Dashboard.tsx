import { useEffect, useState } from 'react';
import { useGroupStore } from '@/store/useGroupStore';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/finance';
import { Share2, Users, Wallet, TrendingDown, PlusCircle, ArrowRight, Calendar, AlertCircle, CheckCircle, TrendingUp, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setMonthlyBudget } from '@/services/db';
import { getWalletBalance, calculateMemberFinancialSummary } from '@/lib/financialUtils';
import { cn } from '@/lib/utils';

export const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    currentGroup,
    selectedMonthYear,
    setSelectedMonthYear,
    transactions,
    currentBudget,
    syncFinances,
    isLoadingFinances,
    groupMembers
  } = useGroupStore();

  const [budgetInput, setBudgetInput] = useState('');
  const [isSettingBudget, setIsSettingBudget] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (currentGroup) syncFinances();
  }, [currentGroup?.id, selectedMonthYear]);

  // NON-BLOCKING EMPTY STATE
  if (!currentGroup) {
    return (
      <div className="space-y-8 max-w-3xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome to RoomieWallet 👋</h1>
          <p className="text-slate-500 mt-1">Get started by creating or joining a shared room.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Link to="/onboarding?mode=create">
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 hover:shadow-md transition-all cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-900 text-lg">
                  <PlusCircle className="w-5 h-5" /> Start a New Group
                </CardTitle>
                <CardDescription className="text-indigo-700">
                  Create a group and act as the Admin to set monthly budgets.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                  Create Group <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </Link>
          <Link to="/onboarding?mode=join">
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 hover:shadow-md transition-all cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-900 text-lg">
                  <Users className="w-5 h-5" /> Join Existing Group
                </CardTitle>
                <CardDescription className="text-emerald-700">
                  Ask your roommate for the 6-character Invite Code.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full border-emerald-600 text-emerald-700 hover:bg-emerald-100">
                  Join Group <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    );
  }

  const handleSetBudget = async () => {
    if (!budgetInput || !currentGroup || !user) return;
    setIsSettingBudget(true);
    try {
      await setMonthlyBudget(currentGroup.id, selectedMonthYear, Number(budgetInput), currentGroup.memberUids.length, user.uid);
      await syncFinances();
      setBudgetInput('');
    } catch (e) { console.error(e); }
    finally { setIsSettingBudget(false); }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(currentGroup.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const walletBalance = getWalletBalance(transactions);
  const memberCount = currentGroup.memberUids.length;

  // Always recalculate per-member share dynamically from member count
  // This fixes the bug where DB stores wrong value if member count changed after budget was set
  const effectiveBudget = currentBudget
    ? { ...currentBudget, perMemberShare: currentBudget.totalAmount / memberCount }
    : null;

  const myFinancials = user ? calculateMemberFinancialSummary(
    user.uid,
    memberCount,
    transactions,
    effectiveBudget ? [effectiveBudget] : []
  ) : null;

  const recentTransactions = [...transactions].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{currentGroup.name}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <button
              onClick={copyCode}
              className="text-sm font-medium text-slate-500 bg-white px-3 py-1 rounded-full border shadow-sm flex items-center gap-1.5 hover:border-indigo-300 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              Code: <span className="text-indigo-600 font-bold tracking-widest">{currentGroup.inviteCode}</span>
              {copied && <span className="text-emerald-600 text-xs ml-1">Copied!</span>}
            </button>
            <span className="text-sm text-slate-400">{memberCount} members</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-400" />
          <Input
            type="month"
            value={selectedMonthYear}
            onChange={e => setSelectedMonthYear(e.target.value)}
            className="w-44 shadow-sm font-medium"
          />
        </div>
      </div>

      {/* Budget Warning (Admin) */}
      {!currentBudget && user?.uid === currentGroup.adminId && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="pt-5 pb-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 text-amber-800 flex-1">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Set monthly budget for {selectedMonthYear}</p>
                <p className="text-sm text-amber-700">Required before tracking finances for this month.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input type="number" placeholder="Total Rent (₹)" value={budgetInput} onChange={e => setBudgetInput(e.target.value)} className="bg-white w-36" />
              <Button onClick={handleSetBudget} disabled={isSettingBudget} className="whitespace-nowrap">Set Budget</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Info (Member) */}
      {!currentBudget && user?.uid !== currentGroup.adminId && (
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="py-6 text-center text-slate-500">
            Waiting for the Admin to set the budget for {selectedMonthYear}
          </CardContent>
        </Card>
      )}

      {/* Financial Cards */}
      {effectiveBudget && myFinancials && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Wallet Balance */}
            <Card className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-0 shadow-lg">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-2 text-indigo-200 mb-1">
                  <Wallet className="w-4 h-4" /><span className="text-xs font-medium">Wallet Balance</span>
                </div>
                <div className="text-3xl font-bold">{formatCurrency(walletBalance)}</div>
                <p className="text-indigo-300 text-xs mt-1">Shared pool this month</p>
              </CardContent>
            </Card>

            {/* My Pending */}
            <Card className={cn(
              'border-0 shadow-lg',
              myFinancials.pendingContribution > 0 ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white' : 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
            )}>
              <CardContent className="pt-5 pb-5">
                <div className={cn('flex items-center gap-2 mb-1', myFinancials.pendingContribution > 0 ? 'text-rose-200' : 'text-emerald-200')}>
                  <TrendingDown className="w-4 h-4" /><span className="text-xs font-medium">My Status</span>
                </div>
                <div className="text-3xl font-bold">{formatCurrency(Math.abs(myFinancials.pendingContribution))}</div>
                <p className={cn('text-xs mt-1', myFinancials.pendingContribution > 0 ? 'text-rose-200' : 'text-emerald-200')}>
                  {myFinancials.pendingContribution > 0 ? 'I still owe' : 'I am ahead by'}
                </p>
              </CardContent>
            </Card>

            {/* Rent Share */}
            <Card className="bg-white border border-slate-100 shadow-lg">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center gap-2 text-slate-500 mb-1">
                  <Users className="w-4 h-4" /><span className="text-xs font-medium">My Rent Share</span>
                </div>
                <div className="text-3xl font-bold text-slate-900">{formatCurrency(effectiveBudget.perMemberShare)}</div>
                <p className="text-slate-400 text-xs mt-1">of ₹{effectiveBudget.totalAmount} total · {memberCount} members</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3 flex-wrap">
            <Link to="/add-transaction">
              <Button className="bg-indigo-600 hover:bg-indigo-700 h-11">
                <PlusCircle className="w-4 h-4 mr-2" /> Add Expense
              </Button>
            </Link>
            <Link to="/wallet">
              <Button variant="outline" className="h-11">
                <Wallet className="w-4 h-4 mr-2" /> Add Contribution
              </Button>
            </Link>
          </div>

          {/* Members Balance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-slate-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  Member Balances
                  <Link to="/members" className="text-xs text-indigo-600 font-medium hover:underline">View All →</Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {groupMembers.slice(0, 4).map(m => {
                  const f = calculateMemberFinancialSummary(m.uid, memberCount, transactions, effectiveBudget ? [effectiveBudget] : []);
                  const settled = Math.abs(f.pendingContribution) < 1;
                  const owes = f.pendingContribution > 0;
                  return (
                    <div
                      key={m.uid}
                      onClick={() => navigate(`/members/${m.uid}`)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-800 text-sm">{m.name} {m.uid === user?.uid ? '(You)' : ''}</span>
                      </div>
                      {settled ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-sm font-semibold"><CheckCircle className="w-3.5 h-3.5" /> Settled</span>
                      ) : owes ? (
                        <span className="text-rose-600 text-sm font-semibold">Owes {formatCurrency(f.pendingContribution)}</span>
                      ) : (
                        <span className="text-emerald-600 text-sm font-semibold">+{formatCurrency(Math.abs(f.pendingContribution))}</span>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card className="border border-slate-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  Recent Transactions
                  <Link to="/ledger" className="text-xs text-indigo-600 font-medium hover:underline">View All →</Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentTransactions.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-4">No transactions yet.</p>
                ) : recentTransactions.map(t => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/transactions/${t.id}`)}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                      ${t.type === 'CONTRIBUTION' ? 'bg-emerald-100' : t.type === 'SPLIT_EXPENSE' ? 'bg-rose-100' : 'bg-indigo-100'}`}>
                      {t.type === 'CONTRIBUTION' ? <Wallet className="w-3.5 h-3.5 text-emerald-600" /> :
                       t.type === 'SPLIT_EXPENSE' ? <Users className="w-3.5 h-3.5 text-rose-600" /> :
                       <Receipt className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{t.description || t.type}</p>
                      <p className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-sm font-bold ${t.type === 'CONTRIBUTION' ? 'text-emerald-600' : 'text-slate-700'}`}>
                      {formatCurrency(t.amount)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
