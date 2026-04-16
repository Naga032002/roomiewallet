import { differenceInMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Expense, Contribution, GroupMember } from '../types';

export const calculateMonthsInGroup = (joinedAtMs: number): number => {
  const joinedDate = new Date(joinedAtMs);
  const currentDate = new Date();
  
  // If they joined this month, differenceInMonths is 0, so we use at least 1 month.
  // A better logic: if they joined, that counts as their first month.
  let months = differenceInMonths(currentDate, joinedDate) + 1;
  return months;
};

// Cumulative Arrears (Total Persistent Debt)
// (Total Months in Group * Monthly Share) - (Total Out-of-Pocket Expenses) - (Total Wallet Contributions)
export const calculateCumulativeArrears = (
  member: GroupMember,
  expenses: Expense[],
  contributions: Contribution[]
): number => {
  const totalMonths = calculateMonthsInGroup(member.joinedAt);
  const totalOwed = totalMonths * member.monthlyShare;
  
  const totalOOP = expenses
    .filter(e => e.payerId === member.uid && e.type === 'reimbursement')
    .reduce((sum, e) => sum + e.amount, 0);
    
  const totalContributed = contributions
    .filter(c => c.memberId === member.uid)
    .reduce((sum, c) => sum + c.amount, 0);

  return totalOwed - totalOOP - totalContributed; 
  // Positive means they are in arrears (they owe money)
  // Negative means they have a surplus
};

// Current Month Due (Monthly Reset)
// (Current Month Share) - (Current Month Out-of-Pocket Expenses) - (Current Month Wallet Contributions)
export const calculateCurrentMonthDue = (
  member: GroupMember,
  expenses: Expense[],
  contributions: Contribution[],
  targetDate: Date = new Date()
): number => {
  const start = startOfMonth(targetDate);
  const end = endOfMonth(targetDate);

  const currentMonthOOP = expenses
    .filter(e => e.payerId === member.uid && e.type === 'reimbursement')
    .filter(e => isWithinInterval(new Date(e.date), { start, end }))
    .reduce((sum, e) => sum + e.amount, 0);

  const currentMonthContributed = contributions
    .filter(c => c.memberId === member.uid)
    .filter(c => isWithinInterval(new Date(c.date), { start, end }))
    .reduce((sum, c) => sum + c.amount, 0);

  return member.monthlyShare - currentMonthOOP - currentMonthContributed;
};

// Formatter fallback
export const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined || isNaN(amount)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};
