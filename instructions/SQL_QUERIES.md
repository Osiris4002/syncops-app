# SyncOps SQL Queries

Run these in Supabase SQL Editor.

## 1) Apply required migrations

```sql
-- Storage RLS fix
-- paste contents of: supabase/migrations/20260418162000_fix_task_images_storage_rls.sql

-- Task numbers
-- paste contents of: supabase/migrations/20260425140000_add_task_number.sql

-- Admin RPC + timer + remarks
-- paste contents of: supabase/migrations/20260425152000_admin_timer_remarks.sql
```

## 2) Create manager/staff user from SQL (manual)

```sql
-- Create auth account
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  lower('newstaff@syncops.test'),
  crypt('password123', gen_salt('bf')),
  now(),
  now(),
  now()
)
RETURNING id;

-- Use returned id in app profile
INSERT INTO public.users (id, name, role)
VALUES ('PUT_USER_ID_HERE', 'New Staff', 'staff');
```

## 3) Delete user

```sql
DELETE FROM auth.users WHERE email = 'newstaff@syncops.test';
```

## 4) Reset task history only (safe restart)

```sql
TRUNCATE TABLE public.images RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.tasks RESTART IDENTITY CASCADE;
TRUNCATE TABLE public.performance_history RESTART IDENTITY CASCADE;

UPDATE public.rooms
SET status = 'vacant',
    updated_at = now();

UPDATE public.users
SET performance_score = 0,
    tasks_completed = 0,
    avg_time = 0,
    updated_at = now();
```

## 5) AI troubleshooting checks

```sql
-- Check recent uploaded images and AI outputs
SELECT id, task_id, ai_result, confidence, created_at
FROM public.images
ORDER BY created_at DESC
LIMIT 20;

-- Check task statuses and remarks
SELECT id, task_number, status, latest_remark, actual_time, timer_elapsed_seconds, timer_started_at
FROM public.tasks
ORDER BY created_at DESC
LIMIT 20;

-- Check room status consistency
SELECT r.id, r.room_number, r.status AS room_status, t.status AS latest_task_status
FROM public.rooms r
LEFT JOIN LATERAL (
  SELECT status
  FROM public.tasks t
  WHERE t.room_id = r.id
  ORDER BY t.created_at DESC
  LIMIT 1
) t ON true
ORDER BY r.room_number;
```
