
-- Add recurrence support to tasks
ALTER TABLE public.tasks ADD COLUMN recurrence jsonb DEFAULT NULL;

-- Task notes table
CREATE TABLE public.task_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_notes (business check via tasks join)
CREATE POLICY "Members can view task notes" ON public.task_notes
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tasks t
  WHERE t.id = task_notes.task_id
  AND t.business_id = get_user_business_id(auth.uid())
));

CREATE POLICY "Members can create task notes" ON public.task_notes
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tasks t
  WHERE t.id = task_notes.task_id
  AND t.business_id = get_user_business_id(auth.uid())
));

CREATE POLICY "Members can delete task notes" ON public.task_notes
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tasks t
  WHERE t.id = task_notes.task_id
  AND t.business_id = get_user_business_id(auth.uid())
));
