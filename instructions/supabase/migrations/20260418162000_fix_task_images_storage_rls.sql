-- Fix Storage RLS for task image uploads.
-- Error addressed: StorageApiError "new row violates row-level security policy"

-- Ensure the bucket exists.
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-images', 'task-images', true)
ON CONFLICT (id) DO NOTHING;

-- Remove old policies if present.
DROP POLICY IF EXISTS "task_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "task_images_staff_insert_own_task" ON storage.objects;
DROP POLICY IF EXISTS "task_images_staff_update_own_task" ON storage.objects;
DROP POLICY IF EXISTS "task_images_staff_delete_own_task" ON storage.objects;

-- Public read for verification images (bucket is public).
CREATE POLICY "task_images_public_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'task-images');

-- Staff can upload only for tasks assigned to them.
-- File naming format in app: <task_id>/<timestamp>.jpg
CREATE POLICY "task_images_staff_insert_own_task"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'task-images'
    AND EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.id::text = split_part(name, '/', 1)
        AND t.assigned_to = auth.uid()
    )
  );

-- Staff can update/delete only files tied to their assigned tasks.
CREATE POLICY "task_images_staff_update_own_task"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'task-images'
    AND EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.id::text = split_part(name, '/', 1)
        AND t.assigned_to = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'task-images'
    AND EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.id::text = split_part(name, '/', 1)
        AND t.assigned_to = auth.uid()
    )
  );

CREATE POLICY "task_images_staff_delete_own_task"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'task-images'
    AND EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.id::text = split_part(name, '/', 1)
        AND t.assigned_to = auth.uid()
    )
  );
