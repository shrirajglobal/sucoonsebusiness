
-- Activity Logs table
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  entity_label text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_logs_business ON public.activity_logs(business_id, created_at DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view activity logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()));

CREATE POLICY "Members can create activity logs" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id(auth.uid()));

-- Add locale settings to businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT '₹',
  ADD COLUMN IF NOT EXISTS date_format text NOT NULL DEFAULT 'dd/MM/yyyy',
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en-IN';
