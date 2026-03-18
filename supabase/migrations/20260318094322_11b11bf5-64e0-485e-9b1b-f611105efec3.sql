-- Time tracking entries
CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration_minutes integer,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view time entries" ON public.time_entries
  FOR SELECT TO public USING (business_id = get_user_business_id(auth.uid()));

CREATE POLICY "Members can create time entries" ON public.time_entries
  FOR INSERT TO authenticated WITH CHECK (business_id = get_user_business_id(auth.uid()));

CREATE POLICY "Members can update time entries" ON public.time_entries
  FOR UPDATE TO public USING (business_id = get_user_business_id(auth.uid()));

CREATE POLICY "Members can delete time entries" ON public.time_entries
  FOR DELETE TO public USING (business_id = get_user_business_id(auth.uid()));

-- Add dependencies column to tasks for Gantt
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS depends_on uuid[] DEFAULT '{}';