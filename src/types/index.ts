export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

export type Role = 'admin' | 'member';

export interface GroupMember {
  uid: string;
  role: Role;
  joinedAt: number; // timestamp
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  adminId: string;
  memberUids: string[];
  createdAt: number;
}

export interface MonthlyBudget {
  id: string;
  groupId: string;
  monthYear: string; // 'YYYY-MM'
  totalAmount: number;
  perMemberShare: number;
  createdBy: string;
  createdAt: number;
}

export type TransactionType = 
  | 'CONTRIBUTION' 
  | 'WALLET_EXPENSE' 
  | 'REIMBURSABLE_EXPENSE' 
  | 'SPLIT_EXPENSE' 
  | 'SETTLEMENT';

export interface Transaction {
  id: string;
  groupId: string;
  type: TransactionType;
  amount: number;
  paidBy: string; // user id
  paidTo?: string | null; // used for settlement
  monthYear: string; // 'YYYY-MM'
  description: string;
  
  createdBy: string;
  createdAt: number;
  
  isDeleted: boolean;
  deletedBy?: string | null;
  deletedAt?: number | null;
}

export interface MemberFinancials {
  userId: string;
  totalContributed: number;
  totalSpent: number;
  totalOwedToWallet: number;
  totalToBeReimbursed: number;
  pendingContribution: number;
  netBalance: number;
}
