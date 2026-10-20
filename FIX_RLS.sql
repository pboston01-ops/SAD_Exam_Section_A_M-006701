-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR TO FIX DATA DISPLAY
-- https://supabase.com/dashboard/project/tpfgfbunbwqyuydcchev/sql/new
-- ============================================================

-- 1. Fix infinite recursion on profiles table
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles 
  FOR SELECT TO authenticated 
  USING (TRUE);

-- 2. Ensure helper function is clean and stable
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'staff');
$$;

-- 3. Confirm permissions
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.scholars TO authenticated;
GRANT SELECT ON public.programs TO authenticated;
GRANT SELECT ON public.submissions TO authenticated;

SELECT 'RLS policies fixed successfully! Refresh your browser.' AS status;
