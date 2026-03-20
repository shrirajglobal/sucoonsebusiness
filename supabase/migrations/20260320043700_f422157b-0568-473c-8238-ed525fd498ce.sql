
-- Add designation to team_members
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS designation text;

-- Add linked_customer_id to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS linked_customer_id uuid;

-- Add next_follow_up to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS next_follow_up date;

-- Create lead_notes table
CREATE TABLE IF NOT EXISTS public.lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  content text NOT NULL,
  note_type text NOT NULL DEFAULT 'note',
  created_by uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

-- RLS: Members can view lead notes for leads in their business
CREATE POLICY "Members can view lead notes" ON public.lead_notes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_notes.lead_id
    AND l.business_id = get_user_business_id(auth.uid())
  ));

-- RLS: Members can create lead notes for leads in their business
CREATE POLICY "Members can create lead notes" ON public.lead_notes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_notes.lead_id
    AND l.business_id = get_user_business_id(auth.uid())
  ));

-- RLS: Members can delete lead notes for leads in their business
CREATE POLICY "Members can delete lead notes" ON public.lead_notes
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_notes.lead_id
    AND l.business_id = get_user_business_id(auth.uid())
  ));
