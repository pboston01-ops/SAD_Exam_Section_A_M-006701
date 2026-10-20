-- ============================================================
-- SAD Exam Section A | M-006701
-- rpc.sql — Run in Supabase SQL Editor
-- Adds the create_scholar_account function so staff can
-- register scholars without triggering email rate limits
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_scholar_account(
  p_email      TEXT,
  p_password   TEXT,
  p_full_name  TEXT,
  p_student_id TEXT,
  p_program_id UUID,
  p_assigned_by UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid UUID;
BEGIN
  -- Create auth user directly (no email sent)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password,
      email_confirmed_at, role, aud,
      created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, is_sso_user,
      confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      v_uid,
      '00000000-0000-0000-0000-000000000000',
      p_email,
      crypt(p_password, gen_salt('bf')),
      NOW(), 'authenticated', 'authenticated',
      NOW(), NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', p_full_name, 'student_id', p_student_id, 'role', 'scholar'),
      false, false, '', '', '', ''
    );
  ELSE
    SELECT id INTO v_uid FROM auth.users WHERE email = p_email LIMIT 1;
  END IF;

  -- Upsert profile
  INSERT INTO public.profiles (id, full_name, student_id, role)
  VALUES (v_uid, p_full_name, p_student_id, 'scholar')
  ON CONFLICT (id) DO UPDATE SET
    full_name  = p_full_name,
    student_id = p_student_id,
    role       = 'scholar';

  -- Assign to program
  INSERT INTO public.scholars (profile_id, program_id, assigned_by)
  VALUES (v_uid, p_program_id, p_assigned_by)
  ON CONFLICT (profile_id) DO UPDATE SET
    program_id  = p_program_id,
    assigned_by = p_assigned_by;

  RETURN jsonb_build_object('success', true, 'id', v_uid, 'email', p_email);
END;
$$;

-- Grant execute to authenticated users (staff)
GRANT EXECUTE ON FUNCTION public.create_scholar_account TO authenticated;

SELECT 'RPC function created. Staff can now register scholars without email rate limits.' AS status;
