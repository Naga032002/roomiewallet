-- ============================================================
-- RoomieWallet - Complete RLS Fix
-- Run this entire script in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- ─── PROFILES ───
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can upsert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can upsert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ─── GROUPS ───
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view their group" ON groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON groups;
DROP POLICY IF EXISTS "Admin can update group" ON groups;

CREATE POLICY "Authenticated users can create groups" ON groups
  FOR INSERT WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Members can view their group" ON groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = groups.id
        AND group_members.user_id = auth.uid()
    )
    OR admin_id = auth.uid()
  );

CREATE POLICY "Admin can update group" ON groups
  FOR UPDATE USING (admin_id = auth.uid());

-- ─── GROUP MEMBERS ───
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view group members" ON group_members;
DROP POLICY IF EXISTS "Users can join groups" ON group_members;
DROP POLICY IF EXISTS "Admin can remove members" ON group_members;

CREATE POLICY "Users can join groups" ON group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can view group members" ON group_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members gm2
      WHERE gm2.group_id = group_members.group_id
        AND gm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own membership" ON group_members
  FOR DELETE USING (user_id = auth.uid());

-- ─── MONTHLY BUDGETS ───
ALTER TABLE monthly_budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view budget" ON monthly_budgets;
DROP POLICY IF EXISTS "Admin can create budget" ON monthly_budgets;
DROP POLICY IF EXISTS "Admin can update budget" ON monthly_budgets;

CREATE POLICY "Members can view budget" ON monthly_budgets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = monthly_budgets.group_id
        AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can create budget" ON monthly_budgets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = monthly_budgets.group_id
        AND groups.admin_id = auth.uid()
    )
  );

CREATE POLICY "Admin can update budget" ON monthly_budgets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = monthly_budgets.group_id
        AND groups.admin_id = auth.uid()
    )
  );

-- ─── TRANSACTIONS ───
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can view transactions" ON transactions;
DROP POLICY IF EXISTS "Members can create transactions" ON transactions;
DROP POLICY IF EXISTS "Members can soft-delete transactions" ON transactions;

CREATE POLICY "Members can view transactions" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = transactions.group_id
        AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create transactions" ON transactions
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = transactions.group_id
        AND group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can soft-delete transactions" ON transactions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_members.group_id = transactions.group_id
        AND group_members.user_id = auth.uid()
    )
  );

-- ─── VERIFY: Check all policies are active ───
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
