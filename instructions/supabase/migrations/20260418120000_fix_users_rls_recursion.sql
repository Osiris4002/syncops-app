-- Fix: PostgreSQL 42P17 "infinite recursion detected in policy for relation users"
--
-- Policies on `users` must NOT query `users` directly (each subquery re-evaluates RLS).
-- Use a SECURITY DEFINER helper so role checks bypass RLS. Run this in the Supabase SQL editor
-- or via: supabase db push / supabase migration up

-- Drop existing policies on public.users (names vary by project)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
  END LOOP;
END $$;

-- Role check runs as function owner — does not recurse through RLS
CREATE OR REPLACE FUNCTION public.syncops_is_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'manager'
  );
$$;

REVOKE ALL ON FUNCTION public.syncops_is_manager() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.syncops_is_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.syncops_is_manager() TO service_role;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Staff: own row. Managers: all rows (e.g. analytics lists all staff).
CREATE POLICY users_select_own_or_manager
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.syncops_is_manager());

-- Sign-up / profile: insert only your own row (id must match auth user).
CREATE POLICY users_insert_own
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Update own row; managers may update others if your app allows it.
CREATE POLICY users_update_own_or_manager
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.syncops_is_manager())
  WITH CHECK (auth.uid() = id OR public.syncops_is_manager());

CREATE POLICY users_delete_own_or_manager
  ON public.users
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id OR public.syncops_is_manager());
