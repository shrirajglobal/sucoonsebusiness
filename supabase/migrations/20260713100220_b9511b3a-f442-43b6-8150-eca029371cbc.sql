
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS granted_by uuid,
  ADD COLUMN IF NOT EXISTS grant_reason text,
  ADD COLUMN IF NOT EXISTS granted_at timestamptz;

ALTER TABLE public.upgrade_requests
  ADD COLUMN IF NOT EXISTS resolved_by uuid,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_note text,
  ADD COLUMN IF NOT EXISTS preferred_billing_cycle text
    CHECK (preferred_billing_cycle IN ('monthly','annual'));

-- Extend allowed statuses so approve/reject actions have a clear terminal state.
ALTER TABLE public.upgrade_requests
  DROP CONSTRAINT IF EXISTS upgrade_requests_status_check;
ALTER TABLE public.upgrade_requests
  ADD CONSTRAINT upgrade_requests_status_check
  CHECK (status IN ('new','contacted','converted','dismissed','pending','approved','rejected','cancelled'));

-- Allow business members to cancel their own pending request.
DROP POLICY IF EXISTS "Business members can cancel own upgrade requests" ON public.upgrade_requests;
CREATE POLICY "Business members can cancel own upgrade requests"
  ON public.upgrade_requests
  FOR UPDATE
  TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) AND status IN ('new','pending'))
  WITH CHECK (business_id = get_user_business_id(auth.uid()) AND status = 'cancelled');
