import { Transaction, MonthlyBudget, MemberFinancials } from '../types';

/**
 * Returns the exact current total in the Wallet.
 * Only Contributions add to it, and Admin Wallet Expenses drain it.
 */
export const getWalletBalance = (transactions: Transaction[]): number => {
  return transactions.reduce((acc, t) => {
    if (t.isDeleted) return acc;
    if (t.type === 'CONTRIBUTION') return acc + t.amount;
    if (t.type === 'WALLET_EXPENSE') return acc - t.amount;
    return acc;
  }, 0);
};

/**
 * Calculates a specific member's exact financial standing.
 * Can be run for a single month or ALL time, depending on how many transactions are provided.
 */
export const calculateMemberFinancialSummary = (
  userId: string,
  activeMembersCount: number,
  transactions: Transaction[],
  budgets: MonthlyBudget[]
): MemberFinancials => {
  let totalContributed = 0;
  let totalSpent = 0; // Total out of pocket
  let totalToBeReimbursed = 0;
  let sharedDebtFromSplits = 0; // Money they owe because someone else paid a split expense
  
  // Base Rent Expected from Admin's Monthly Budgets
  let totalExpectedRentShare = budgets.reduce((acc, b) => acc + b.perMemberShare, 0);

  transactions.forEach(t => {
    if (t.isDeleted) return;
    
    if (t.type === 'CONTRIBUTION' && t.paidBy === userId) {
      totalContributed += t.amount;
    }
    
    if (t.type === 'REIMBURSABLE_EXPENSE' && t.paidBy === userId) {
      totalSpent += t.amount;
      totalToBeReimbursed += t.amount;
    }
    
    if (t.type === 'SPLIT_EXPENSE') {
      const myShareOfSplit = t.amount / (activeMembersCount || 1);
      sharedDebtFromSplits += myShareOfSplit;
      
      if (t.paidBy === userId) {
        totalSpent += t.amount;
      }
    }
    
    // Settling debts
    if (t.type === 'SETTLEMENT') {
      if (t.paidBy === userId) totalContributed += t.amount; // Treating settlement to another as contribution to their debt reduction
    }
  });

  // What do they owe to the wallet for rent?
  const pendingContribution = totalExpectedRentShare - totalContributed;
  
  // Total Debt = Rent they haven't paid + Their share of splits they haven't paid
  // minus their total out-of-pocket spendings
  const netBalance = (pendingContribution + sharedDebtFromSplits) - totalSpent;

  return {
    userId,
    totalContributed,
    totalSpent,
    totalOwedToWallet: pendingContribution > 0 ? pendingContribution : 0,
    totalToBeReimbursed,
    pendingContribution,
    netBalance
  };
};

/**
 * Recalculates exact shares avoiding Infinity errors
 */
export const recalculateMemberShares = (totalRent: number, activeMembersCount: number): number => {
  if (activeMembersCount <= 0) return 0;
  return totalRent / activeMembersCount;
};
