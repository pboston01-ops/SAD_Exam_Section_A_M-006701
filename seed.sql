-- ============================================================
-- SAD Exam Section A | M-006701 | Phrence Kyle M. Boston
-- seed.sql — Run SECOND in Supabase SQL Editor (after schema.sql)
-- Creates all auth users + profiles + scholars + submissions
-- ============================================================

-- ============================================================
-- STEP 1: Programs
-- ============================================================
INSERT INTO public.programs (id, program_name, max_gwa, min_units, allowed_failed, allowed_incomplete, allowed_dropped, deadline)
VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001','Merit Scholar',    1.75,18,0,0,0,'2026-10-30 17:00:00+08'),
  ('aaaaaaaa-0002-0002-0002-000000000002','Community Scholar',2.25,15,0,0,1,'2026-10-30 17:00:00+08')
ON CONFLICT (program_name) DO UPDATE SET
  max_gwa=EXCLUDED.max_gwa, min_units=EXCLUDED.min_units,
  allowed_dropped=EXCLUDED.allowed_dropped, deadline=EXCLUDED.deadline;

-- ============================================================
-- STEP 2: Create auth users (SQL Editor runs as superuser)
-- ============================================================
DO $$
DECLARE
  elem JSONB;
  accounts JSONB := '[
    {"email":"staff@scholarship.edu.ph",         "pw":"Staff@2026!",   "name":"Scholarship Staff",   "sid":null,  "role":"staff"},
    {"email":"scholar.a01@scholarship.edu.ph",   "pw":"Scholar@2026!", "name":"Alicia Reyes",        "sid":"A01", "role":"scholar"},
    {"email":"scholar.a02@scholarship.edu.ph",   "pw":"Scholar@2026!", "name":"Benedict Santos",     "sid":"A02", "role":"scholar"},
    {"email":"scholar.a03@scholarship.edu.ph",   "pw":"Scholar@2026!", "name":"Carmela Villanueva",  "sid":"A03", "role":"scholar"},
    {"email":"scholar.a04@scholarship.edu.ph",   "pw":"Scholar@2026!", "name":"Danilo Cruz",         "sid":"A04", "role":"scholar"},
    {"email":"scholar.a05@scholarship.edu.ph",   "pw":"Scholar@2026!", "name":"Elena Pascual",       "sid":"A05", "role":"scholar"},
    {"email":"scholar.a06@scholarship.edu.ph",   "pw":"Scholar@2026!", "name":"Fernando Dela Torre", "sid":"A06", "role":"scholar"}
  ]';
BEGIN
  FOR elem IN SELECT jsonb_array_elements(accounts) LOOP
    -- Reset password + confirm if user exists
    UPDATE auth.users SET
      encrypted_password = crypt(elem->>'pw', gen_salt('bf')),
      email_confirmed_at = NOW(),
      updated_at = NOW(),
      raw_user_meta_data = jsonb_build_object(
        'full_name', elem->>'name',
        'student_id', elem->>'sid',
        'role', elem->>'role'
      )
    WHERE email = elem->>'email';

    -- Create if not exists
    IF NOT FOUND THEN
      INSERT INTO auth.users (
        id, instance_id, email, encrypted_password,
        email_confirmed_at, role, aud,
        created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        is_super_admin, is_sso_user,
        confirmation_token, recovery_token,
        email_change_token_new, email_change
      ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        elem->>'email',
        crypt(elem->>'pw', gen_salt('bf')),
        NOW(), 'authenticated', 'authenticated',
        NOW(), NOW(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('full_name', elem->>'name', 'student_id', elem->>'sid', 'role', elem->>'role'),
        false, false, '', '', '', ''
      );
      RAISE NOTICE 'Created: %', elem->>'email';
    ELSE
      RAISE NOTICE 'Updated: %', elem->>'email';
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- STEP 3: Profiles (upsert using real UUIDs from auth.users)
-- ============================================================
DO $$
DECLARE
  uid_staff UUID; uid_a01 UUID; uid_a02 UUID; uid_a03 UUID;
  uid_a04 UUID;   uid_a05 UUID; uid_a06 UUID;
  merit UUID := 'aaaaaaaa-0001-0001-0001-000000000001';
  comm  UUID := 'aaaaaaaa-0002-0002-0002-000000000002';
  sc_a01 UUID; sc_a02 UUID; sc_a03 UUID;
  sc_a04 UUID; sc_a05 UUID; sc_a06 UUID;
BEGIN
  SELECT id INTO uid_staff FROM auth.users WHERE email='staff@scholarship.edu.ph'           LIMIT 1;
  SELECT id INTO uid_a01   FROM auth.users WHERE email='scholar.a01@scholarship.edu.ph'     LIMIT 1;
  SELECT id INTO uid_a02   FROM auth.users WHERE email='scholar.a02@scholarship.edu.ph'     LIMIT 1;
  SELECT id INTO uid_a03   FROM auth.users WHERE email='scholar.a03@scholarship.edu.ph'     LIMIT 1;
  SELECT id INTO uid_a04   FROM auth.users WHERE email='scholar.a04@scholarship.edu.ph'     LIMIT 1;
  SELECT id INTO uid_a05   FROM auth.users WHERE email='scholar.a05@scholarship.edu.ph'     LIMIT 1;
  SELECT id INTO uid_a06   FROM auth.users WHERE email='scholar.a06@scholarship.edu.ph'     LIMIT 1;

  -- Profiles
  INSERT INTO public.profiles (id, full_name, student_id, role) VALUES
    (uid_staff,'Scholarship Staff',   NULL,  'staff'),
    (uid_a01,  'Alicia Reyes',        'A01', 'scholar'),
    (uid_a02,  'Benedict Santos',     'A02', 'scholar'),
    (uid_a03,  'Carmela Villanueva',  'A03', 'scholar'),
    (uid_a04,  'Danilo Cruz',         'A04', 'scholar'),
    (uid_a05,  'Elena Pascual',       'A05', 'scholar'),
    (uid_a06,  'Fernando Dela Torre', 'A06', 'scholar')
  ON CONFLICT (id) DO UPDATE SET
    full_name=EXCLUDED.full_name, student_id=EXCLUDED.student_id, role=EXCLUDED.role;

  -- Scholars
  INSERT INTO public.scholars (profile_id, program_id, assigned_by) VALUES
    (uid_a01, merit, uid_staff),
    (uid_a02, merit, uid_staff),
    (uid_a03, comm,  uid_staff),
    (uid_a04, comm,  uid_staff),
    (uid_a05, merit, uid_staff),
    (uid_a06, comm,  uid_staff)
  ON CONFLICT (profile_id) DO UPDATE SET
    program_id=EXCLUDED.program_id, assigned_by=EXCLUDED.assigned_by;

  SELECT id INTO sc_a01 FROM public.scholars WHERE profile_id=uid_a01;
  SELECT id INTO sc_a02 FROM public.scholars WHERE profile_id=uid_a02;
  SELECT id INTO sc_a03 FROM public.scholars WHERE profile_id=uid_a03;
  SELECT id INTO sc_a04 FROM public.scholars WHERE profile_id=uid_a04;
  SELECT id INTO sc_a05 FROM public.scholars WHERE profile_id=uid_a05;
  SELECT id INTO sc_a06 FROM public.scholars WHERE profile_id=uid_a06;

  -- A01: Merit, GWA 1.75, at exact deadline → Compliant (TC01)
  INSERT INTO public.submissions (scholar_id,academic_year,semester,gwa,enrolled_units,failed_count,incomplete_count,dropped_count,evidence_reference,submitted_at,verification_status,verified_by,verified_at)
  VALUES (sc_a01,'2026-2027','1',1.75,18,0,0,0,'GR-A01-2026-2027-S1.pdf','2026-10-30 09:00:00+00','Verified',uid_staff,NOW())
  ON CONFLICT (scholar_id,academic_year,semester) DO UPDATE SET gwa=1.75,enrolled_units=18,failed_count=0,incomplete_count=0,dropped_count=0,submitted_at='2026-10-30 09:00:00+00',verification_status='Verified',verified_by=uid_staff,verified_at=NOW(),compliance_result=NULL,renewal_decision=NULL;

  -- A02: Merit, GWA 1.76 → With Deficiency: GWA (TC02)
  INSERT INTO public.submissions (scholar_id,academic_year,semester,gwa,enrolled_units,failed_count,incomplete_count,dropped_count,evidence_reference,submitted_at,verification_status,verified_by,verified_at)
  VALUES (sc_a02,'2026-2027','1',1.76,18,0,0,0,'GR-A02-2026-2027-S1.pdf','2026-10-29 09:00:00+00','Verified',uid_staff,NOW())
  ON CONFLICT (scholar_id,academic_year,semester) DO UPDATE SET gwa=1.76,verification_status='Verified',verified_by=uid_staff,verified_at=NOW(),compliance_result=NULL,renewal_decision=NULL;

  -- A03: Community, GWA 2.25, 1 dropped → Compliant (TC03)
  INSERT INTO public.submissions (scholar_id,academic_year,semester,gwa,enrolled_units,failed_count,incomplete_count,dropped_count,evidence_reference,submitted_at,verification_status,verified_by,verified_at)
  VALUES (sc_a03,'2026-2027','1',2.25,15,0,0,1,'GR-A03-2026-2027-S1.pdf','2026-10-29 09:00:00+00','Verified',uid_staff,NOW())
  ON CONFLICT (scholar_id,academic_year,semester) DO UPDATE SET gwa=2.25,enrolled_units=15,dropped_count=1,verification_status='Verified',verified_by=uid_staff,verified_at=NOW(),compliance_result=NULL,renewal_decision=NULL;

  -- A04: Community, 14 units, 1 INC → With Deficiency (TC04)
  INSERT INTO public.submissions (scholar_id,academic_year,semester,gwa,enrolled_units,failed_count,incomplete_count,dropped_count,evidence_reference,submitted_at,verification_status,verified_by,verified_at)
  VALUES (sc_a04,'2026-2027','1',2.25,14,0,1,0,'GR-A04-2026-2027-S1.pdf','2026-10-29 09:00:00+00','Verified',uid_staff,NOW())
  ON CONFLICT (scholar_id,academic_year,semester) DO UPDATE SET gwa=2.25,enrolled_units=14,incomplete_count=1,verification_status='Verified',verified_by=uid_staff,verified_at=NOW(),compliance_result=NULL,renewal_decision=NULL;

  -- A05: Merit, 1 failed, 1 min LATE → With Deficiency (TC05)
  INSERT INTO public.submissions (scholar_id,academic_year,semester,gwa,enrolled_units,failed_count,incomplete_count,dropped_count,evidence_reference,submitted_at,verification_status,verified_by,verified_at)
  VALUES (sc_a05,'2026-2027','1',1.50,18,1,0,0,'GR-A05-2026-2027-S1.pdf','2026-10-30 09:01:00+00','Verified',uid_staff,NOW())
  ON CONFLICT (scholar_id,academic_year,semester) DO UPDATE SET gwa=1.50,failed_count=1,submitted_at='2026-10-30 09:01:00+00',verification_status='Verified',verified_by=uid_staff,verified_at=NOW(),compliance_result=NULL,renewal_decision=NULL;

  -- A06: Community, Pending → blocked (TC06)
  INSERT INTO public.submissions (scholar_id,academic_year,semester,gwa,enrolled_units,failed_count,incomplete_count,dropped_count,evidence_reference,submitted_at,verification_status)
  VALUES (sc_a06,'2026-2027','1',2.00,15,0,0,0,'GR-A06-2026-2027-S1.pdf','2026-10-29 09:00:00+00','Pending')
  ON CONFLICT (scholar_id,academic_year,semester) DO UPDATE SET gwa=2.00,verification_status='Pending',verified_by=NULL,compliance_result=NULL,renewal_decision=NULL;

  RAISE NOTICE 'Seed complete.';
END $$;

-- ============================================================
-- VERIFY
-- ============================================================
SELECT p.student_id,p.full_name,p.role,pg.program_name,sub.gwa,sub.verification_status
FROM public.profiles p
LEFT JOIN public.scholars sc ON sc.profile_id=p.id
LEFT JOIN public.programs pg ON pg.id=sc.program_id
LEFT JOIN public.submissions sub ON sub.scholar_id=sc.id
WHERE p.role='scholar' ORDER BY p.student_id;
