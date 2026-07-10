
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(lower((auth.jwt() ->> 'email')) = 'suvee.fashion@gmail.com', false);
$$;

REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

CREATE TABLE public.upgrade_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  requester_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_name text,
  requester_phone text,
  requested_tier text NOT NULL CHECK (requested_tier IN ('starter','growth','scale')),
  module_context text,
  note text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','converted','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_upgrade_requests_business ON public.upgrade_requests(business_id);
CREATE INDEX idx_upgrade_requests_created_at ON public.upgrade_requests(created_at DESC);

GRANT SELECT, INSERT ON public.upgrade_requests TO authenticated;
GRANT ALL ON public.upgrade_requests TO service_role;

ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view own upgrade requests"
  ON public.upgrade_requests FOR SELECT
  TO authenticated
  USING (business_id = public.get_user_business_id(auth.uid()) OR public.is_super_admin());

CREATE POLICY "Business members can create upgrade requests"
  ON public.upgrade_requests FOR INSERT
  TO authenticated
  WITH CHECK (business_id = public.get_user_business_id(auth.uid()));

CREATE POLICY "Super admin can update upgrade requests"
  ON public.upgrade_requests FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE TRIGGER update_upgrade_requests_updated_at
  BEFORE UPDATE ON public.upgrade_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
