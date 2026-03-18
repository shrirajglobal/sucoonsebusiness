-- Sub-tasks / checklists table
CREATE TABLE public.sub_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sub_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view sub_tasks" ON public.sub_tasks
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM public.tasks t WHERE t.id = sub_tasks.task_id AND t.business_id = get_user_business_id(auth.uid())
  ));

CREATE POLICY "Members can create sub_tasks" ON public.sub_tasks
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tasks t WHERE t.id = sub_tasks.task_id AND t.business_id = get_user_business_id(auth.uid())
  ));

CREATE POLICY "Members can update sub_tasks" ON public.sub_tasks
  FOR UPDATE TO public
  USING (EXISTS (
    SELECT 1 FROM public.tasks t WHERE t.id = sub_tasks.task_id AND t.business_id = get_user_business_id(auth.uid())
  ));

CREATE POLICY "Members can delete sub_tasks" ON public.sub_tasks
  FOR DELETE TO public
  USING (EXISTS (
    SELECT 1 FROM public.tasks t WHERE t.id = sub_tasks.task_id AND t.business_id = get_user_business_id(auth.uid())
  ));

-- Won/Lost tracking: add lost_reason to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lost_reason text;