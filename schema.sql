-- ============================================================
-- SAD Exam Section A | M-006701 | Phrence Kyle M. Boston
-- schema.sql — Run FIRST in Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT NOT NULL,
  student_id TEXT,
  role       TEXT NOT NULL DEFAULT 'scholar' CHECK (role IN ('scholar','staff')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, student_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'student_id',
    COALESCE(NEW.raw_user_meta_data->>'role', 'scholar')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- PROGRAMS (scholarship policy thresholds)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.programs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_name     TEXT NOT NULL UNIQUE,
  max_gwa          NUMERIC(4,2) NOT NULL,
  min_units        INT NOT NULL,
  allowed_failed   INT NOT NULL DEFAULT 0,
  allowed_incomplete INT NOT NULL DEFAULT 0,
  allowed_dropped  INT NOT NULL DEFAULT 0,
  deadline         TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SCHOLARS (assignment of profile to program)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scholars (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  program_id  UUID NOT NULL REFERENCES public.programs(id),
  is_active   BOOLEAN DEFAULT TRUE,
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUBMISSIONS (one per scholar per academic year+semester)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.submissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scholar_id          UUID NOT NULL REFERENCES public.scholars(id) ON DELETE CASCADE,
  academic_year       TEXT NOT NULL,
  semester            TEXT NOT NULL,
  gwa                 NUMERIC(4,2) NOT NULL CHECK (gwa BETWEEN 1.00 AND 5.00),
  enrolled_units      INT NOT NULL CHECK (enrolled_units >= 0),
  failed_count        INT NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  incomplete_count    INT NOT NULL DEFAULT 0 CHECK (incomplete_count >= 0),
  dropped_count       INT NOT NULL DEFAULT 0 CHECK (dropped_count >= 0),
  evidence_reference  TEXT NOT NULL,
  submitted_at        TIMESTAMPTZ DEFAULT NOW(),
  verification_status TEXT NOT NULL DEFAULT 'Pending' CHECK (verification_status IN ('Pending','Verified','Returned')),
  verification_notes  TEXT,
  verified_by         UUID REFERENCES public.profiles(id),
  verified_at         TIMESTAMPTZ,
  compliance_result   TEXT CHECK (compliance_result IN ('Compliant','With Deficiency')),
  compliance_reasons  TEXT,
  renewal_decision    TEXT CHECK (renewal_decision IN ('Approved','Held')),
  renewal_notes       TEXT,
  decided_by          UUID REFERENCES public.profiles(id),
  decided_at          TIMESTAMPTZ,
  UNIQUE (scholar_id, academic_year, semester)
);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.submissions(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES public.profiles(id),
  action        TEXT NOT NULL,
  details       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scholars    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log   ENABLE ROW LEVEL SECURITY;

-- Helper: is current user a staff?
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'staff');
$$;

-- Helper: get scholar id for current user
CREATE OR REPLACE FUNCTION public.my_scholar_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id FROM public.scholars WHERE profile_id = auth.uid() LIMIT 1;
$$;

-- PROFILES policies
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
  TO authenticated USING (TRUE);

CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- PROGRAMS policies (everyone reads, staff writes)
DROP POLICY IF EXISTS "programs_select" ON public.programs;
DROP POLICY IF EXISTS "programs_insert" ON public.programs;

CREATE POLICY "programs_select" ON public.programs FOR SELECT USING (TRUE);
CREATE POLICY "programs_insert" ON public.programs FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "programs_update" ON public.programs FOR UPDATE USING (public.is_staff());

-- SCHOLARS policies
DROP POLICY IF EXISTS "scholars_select" ON public.scholars;
DROP POLICY IF EXISTS "scholars_insert" ON public.scholars;
DROP POLICY IF EXISTS "scholars_update" ON public.scholars;

CREATE POLICY "scholars_select" ON public.scholars FOR SELECT
  USING (profile_id = auth.uid() OR public.is_staff());

CREATE POLICY "scholars_insert" ON public.scholars FOR INSERT
  WITH CHECK (public.is_staff());

CREATE POLICY "scholars_update" ON public.scholars FOR UPDATE
  USING (public.is_staff());

-- SUBMISSIONS policies
DROP POLICY IF EXISTS "submissions_select" ON public.submissions;
DROP POLICY IF EXISTS "submissions_insert" ON public.submissions;
DROP POLICY IF EXISTS "submissions_update_scholar" ON public.submissions;
DROP POLICY IF EXISTS "submissions_update_staff" ON public.submissions;

CREATE POLICY "submissions_select" ON public.submissions FOR SELECT
  USING (scholar_id = public.my_scholar_id() OR public.is_staff());

CREATE POLICY "submissions_insert" ON public.submissions FOR INSERT
  WITH CHECK (scholar_id = public.my_scholar_id());

CREATE POLICY "submissions_update_scholar" ON public.submissions FOR UPDATE
  USING (scholar_id = public.my_scholar_id() AND verification_status = 'Returned')
  WITH CHECK (scholar_id = public.my_scholar_id());

CREATE POLICY "submissions_update_staff" ON public.submissions FOR UPDATE
  USING (public.is_staff());

-- AUDIT LOG policies
DROP POLICY IF EXISTS "audit_select" ON public.audit_log;
DROP POLICY IF EXISTS "audit_insert" ON public.audit_log;

CREATE POLICY "audit_select" ON public.audit_log FOR SELECT
  USING (
    public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.submissions s
      JOIN public.scholars sc ON sc.id = s.scholar_id
      WHERE s.id = audit_log.submission_id AND sc.profile_id = auth.uid()
    )
  );

CREATE POLICY "audit_insert" ON public.audit_log FOR INSERT
  WITH CHECK (actor_id = auth.uid() OR public.is_staff());

-- ============================================================
-- GRANTS
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.programs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.scholars TO authenticated;
GRANT UPDATE ON public.scholars TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.submissions TO authenticated;
GRANT SELECT, INSERT ON public.audit_log TO authenticated;

SELECT 'Schema created successfully.' AS status;
