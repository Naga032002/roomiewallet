import { supabase } from '../lib/supabase';
import { Group, GroupMember, MonthlyBudget, Transaction, TransactionType } from '../types';

export const generateInviteCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const mapGroup = (g: any, memberUids: string[]): Group => ({
  id: g.id,
  name: g.name,
  inviteCode: g.invite_code,
  adminId: g.admin_id,
  memberUids,
  createdAt: new Date(g.created_at).getTime()
});

const mapTransaction = (t: any): Transaction => ({
  id: t.id,
  groupId: t.group_id,
  type: t.type as TransactionType,
  amount: Number(t.amount),
  paidBy: t.paid_by,
  paidTo: t.paid_to,
  monthYear: t.month_year,
  description: t.description || '',
  createdBy: t.created_by,
  createdAt: new Date(t.created_at).getTime(),
  isDeleted: t.is_deleted,
  deletedBy: t.deleted_by,
  deletedAt: t.deleted_at ? new Date(t.deleted_at).getTime() : null,
});

/* ─────────────────── Group CRUD ─────────────────── */

export const createGroup = async (name: string, adminUid: string): Promise<Group> => {
  const inviteCode = generateInviteCode();

  const { data: groupData, error: groupError } = await supabase
    .from('groups')
    .insert([{ name, invite_code: inviteCode, admin_id: adminUid }])
    .select()
    .single();

  if (groupError) throw new Error(groupError.message);

  const { error: memberError } = await supabase
    .from('group_members')
    .insert([{ group_id: groupData.id, user_id: adminUid, role: 'admin' }]);

  if (memberError) throw new Error(memberError.message);

  return mapGroup(groupData, [adminUid]);
};

export const updateGroup = async (groupId: string, name: string): Promise<void> => {
  const { error } = await supabase
    .from('groups')
    .update({ name })
    .eq('id', groupId);
  if (error) throw new Error(error.message);
};

export const deleteGroup = async (groupId: string): Promise<void> => {
  // Delete members first, then the group (cascade should handle rest)
  await supabase.from('group_members').delete().eq('group_id', groupId);
  await supabase.from('transactions').delete().eq('group_id', groupId);
  await supabase.from('monthly_budgets').delete().eq('group_id', groupId);
  const { error } = await supabase.from('groups').delete().eq('id', groupId);
  if (error) throw new Error(error.message);
};

export const removeMember = async (groupId: string, uid: string): Promise<void> => {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', uid);
  if (error) throw new Error(error.message);
};

/* ─────────────────── Group Fetching ─────────────────── */

/** Returns ALL groups the user belongs to (multi-room support) */
export const fetchUserGroups = async (uid: string): Promise<Group[]> => {
  try {
    const { data: memberData, error: memberError } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', uid);

    // New user or RLS error — just return empty list, no crash
    if (memberError || !memberData || memberData.length === 0) return [];

    const groupIds = memberData.map((m: any) => m.group_id);

    const { data: groupsData, error: groupsError } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds);

    if (groupsError || !groupsData) return [];

    // For each group, get member UIDs
    const groups: Group[] = await Promise.all(
      groupsData.map(async (g: any) => {
        const { data: members } = await supabase
          .from('group_members')
          .select('user_id')
          .eq('group_id', g.id);
        const memberUids = (members ?? []).map((m: any) => m.user_id);
        return mapGroup(g, memberUids);
      })
    );

    return groups;
  } catch (e) {
    // Never crash the app on a fetch error — return empty
    console.error('fetchUserGroups error:', e);
    return [];
  }
};


/** Legacy single-group fetch — kept for backward compat */
export const fetchUserGroup = async (uid: string): Promise<Group | null> => {
  const groups = await fetchUserGroups(uid);
  return groups.length > 0 ? groups[0] : null;
};

export const joinGroupByCode = async (code: string, uid: string): Promise<Group | null> => {
  const { data: groupData, error: fetchError } = await supabase
    .from('groups')
    .select('*')
    .eq('invite_code', code.toUpperCase())
    .single();

  if (fetchError || !groupData) return null;

  const { data: existingMembers, error: membersError } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupData.id);

  if (membersError) throw new Error(membersError.message);

  const memberUids = existingMembers.map((m: any) => m.user_id);

  if (!memberUids.includes(uid)) {
    await supabase.from('group_members').insert([{ group_id: groupData.id, user_id: uid, role: 'member' }]);
    memberUids.push(uid);
  }

  return mapGroup(groupData, memberUids);
};

export const fetchGroupMembersDisplayNames = async (groupId: string): Promise<{uid: string, name: string}[]> => {
  const { data, error } = await supabase
    .from('group_members')
    .select('user_id, profiles(display_name)')
    .eq('group_id', groupId);

  if (error) throw new Error(error.message);

  return data.map((m: any) => ({
    uid: m.user_id,
    name: m.profiles?.display_name || 'Unknown User'
  }));
};

/* ─────────────────── Transactions ─────────────────── */

export const fetchGroupTransactions = async (groupId: string, monthYear: string): Promise<Transaction[]> => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('group_id', groupId)
    .eq('month_year', monthYear)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data.map(mapTransaction);
};

export const addTransaction = async (
  groupId: string,
  type: TransactionType,
  amount: number,
  paidBy: string,
  monthYear: string,
  description: string,
  createdBy: string,
  paidTo?: string
): Promise<Transaction> => {
  const { data, error } = await supabase
    .from('transactions')
    .insert([{
      group_id: groupId,
      type,
      amount,
      paid_by: paidBy,
      paid_to: paidTo || null,
      month_year: monthYear,
      description,
      created_by: createdBy
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapTransaction(data);
};

export const softDeleteTransaction = async (transactionId: string, deletedByUid: string): Promise<void> => {
  const { error } = await supabase
    .from('transactions')
    .update({
      is_deleted: true,
      deleted_by: deletedByUid,
      deleted_at: new Date().toISOString()
    })
    .eq('id', transactionId);

  if (error) throw new Error(error.message);
};

/* ─────────────────── Budget ─────────────────── */

/**
 * Set monthly budget — auto-splits equally across memberCount.
 * Called when admin enters total rent for the month.
 */
export const setMonthlyBudget = async (
  groupId: string,
  monthYear: string,
  totalAmount: number,
  activeMembersCount: number,
  adminId: string
): Promise<MonthlyBudget> => {
  if (activeMembersCount <= 0) throw new Error('Cannot set budget with zero members.');

  // Auto equal split
  const perMemberShare = totalAmount / activeMembersCount;

  const { data, error } = await supabase
    .from('monthly_budgets')
    .upsert(
      { group_id: groupId, month_year: monthYear, total_amount: totalAmount, per_member_share: perMemberShare, created_by: adminId },
      { onConflict: 'group_id,month_year' }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    groupId: data.group_id,
    monthYear: data.month_year,
    totalAmount: Number(data.total_amount),
    perMemberShare: Number(data.per_member_share),
    createdBy: data.created_by,
    createdAt: new Date(data.created_at).getTime()
  };
};

export const fetchMonthlyBudget = async (groupId: string, monthYear: string): Promise<MonthlyBudget | null> => {
  const { data, error } = await supabase
    .from('monthly_budgets')
    .select('*')
    .eq('group_id', groupId)
    .eq('month_year', monthYear)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    groupId: data.group_id,
    monthYear: data.month_year,
    totalAmount: Number(data.total_amount),
    perMemberShare: Number(data.per_member_share),
    createdBy: data.created_by,
    createdAt: new Date(data.created_at).getTime()
  };
};
