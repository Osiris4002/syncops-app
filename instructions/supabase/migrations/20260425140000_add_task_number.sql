-- Add stable task numbers for easier operational tracking.
-- Backfills existing tasks and auto-generates numbers for new tasks.

CREATE SEQUENCE IF NOT EXISTS public.tasks_task_number_seq;

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS task_number BIGINT;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
  FROM public.tasks
  WHERE task_number IS NULL
)
UPDATE public.tasks t
SET task_number = numbered.rn
FROM numbered
WHERE t.id = numbered.id;

SELECT setval(
  'public.tasks_task_number_seq',
  COALESCE((SELECT MAX(task_number) FROM public.tasks), 0),
  true
);

ALTER TABLE public.tasks
ALTER COLUMN task_number SET DEFAULT nextval('public.tasks_task_number_seq');

UPDATE public.tasks
SET task_number = DEFAULT
WHERE task_number IS NULL;

ALTER TABLE public.tasks
ALTER COLUMN task_number SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_task_number_key'
      AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE public.tasks
    ADD CONSTRAINT tasks_task_number_key UNIQUE (task_number);
  END IF;
END
$$;
