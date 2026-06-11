-- Manager admin RPCs, task remarks, and persistent task timer fields.

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS latest_remark TEXT;

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS timer_elapsed_seconds INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'manager'
  );
$$;

CREATE OR REPLACE FUNCTION public.manager_create_app_user(
  user_email TEXT,
  user_password TEXT,
  user_name TEXT,
  user_role TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id UUID := gen_random_uuid();
BEGIN
  IF NOT public.is_manager() THEN
    RAISE EXCEPTION 'Only managers can create users';
  END IF;

  IF user_role NOT IN ('manager', 'staff') THEN
    RAISE EXCEPTION 'Invalid role: %', user_role;
  END IF;

  IF user_email IS NULL OR length(trim(user_email)) = 0 THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  IF user_password IS NULL OR length(user_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = lower(trim(user_email))) THEN
    RAISE EXCEPTION 'A user with this email already exists';
  END IF;

  INSERT INTO auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    new_user_id,
    'authenticated',
    'authenticated',
    lower(trim(user_email)),
    crypt(user_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', user_name, 'role', user_role),
    NOW(),
    NOW()
  );

  INSERT INTO public.users (id, name, role)
  VALUES (new_user_id, user_name, user_role);

  RETURN new_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.manager_delete_app_user(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_manager() THEN
    RAISE EXCEPTION 'Only managers can delete users';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_create_app_user(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manager_delete_app_user(UUID) TO authenticated;
