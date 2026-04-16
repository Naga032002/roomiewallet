-- ROOMIEWALLET PRODUCTION SCHEMA

-- 1. Profiles (Automatically tracks authenticated users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Groups (Rooms)
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  admin_id UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Group Members
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 4. Monthly Budgets (Core Requirement: Month-wise budget tracking)
CREATE TABLE IF NOT EXISTS public.monthly_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- Expected Format: 'YYYY-MM' (e.g., '2023-10')
  total_amount NUMERIC NOT NULL,
  per_member_share NUMERIC NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, month_year)
);

-- 5. Transactions (The Unified Ledger + Soft Delete Architecture)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  
  -- Four specified types of expenses + Contributions & Settlements
  type TEXT NOT NULL CHECK (type IN (
    'CONTRIBUTION', 
    'WALLET_EXPENSE', 
    'REIMBURSABLE_EXPENSE', 
    'SPLIT_EXPENSE', 
    'SETTLEMENT'
  )),
  
  amount NUMERIC NOT NULL,
  
  -- Who is paying the money? (For wallet expense, it's the Admin ID)
  paid_by UUID REFERENCES public.profiles(id) NOT NULL,
  
  -- Who is receiving the money? (Only strictly relevant for 'SETTLEMENT', otherwise null)
  paid_to UUID REFERENCES public.profiles(id),
  
  month_year TEXT NOT NULL,
  description TEXT,
  
  -- Strict Audit Log
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft Delete Implementation
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ
);
