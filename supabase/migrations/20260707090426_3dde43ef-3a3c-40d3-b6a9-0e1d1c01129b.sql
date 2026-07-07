
-- 1. Plan-access helper functions
CREATE OR REPLACE FUNCTION public.business_has_scale_access(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.business_id = _business_id
      AND (
        (s.plan = 'scale' AND s.status IN ('active','trialing'))
        -- Trial does NOT include Scale features (Growth-only per marketing copy)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.business_has_growth_access(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.business_id = _business_id
      AND (
        (s.plan IN ('growth','scale') AND s.status = 'active')
        OR (
          s.status = 'trialing'
          AND (s.trial_end + (s.extra_days || ' days')::interval) > now()
        )
      )
  );
$$;

-- 2. Scale-only table policies
-- transactions
DROP POLICY IF EXISTS "Members can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Members can create transactions" ON public.transactions;
DROP POLICY IF EXISTS "Members can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Members can delete transactions" ON public.transactions;
CREATE POLICY "Scale members can view transactions" ON public.transactions FOR SELECT TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can create transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can update transactions" ON public.transactions FOR UPDATE TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can delete transactions" ON public.transactions FOR DELETE TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

-- inventory_items
DROP POLICY IF EXISTS "Members can view inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Members can create inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Members can update inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Members can delete inventory" ON public.inventory_items;
CREATE POLICY "Scale members can view inventory" ON public.inventory_items FOR SELECT TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can create inventory" ON public.inventory_items FOR INSERT TO authenticated WITH CHECK (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can update inventory" ON public.inventory_items FOR UPDATE TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can delete inventory" ON public.inventory_items FOR DELETE TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

-- vendors
DROP POLICY IF EXISTS "Members can view vendors" ON public.vendors;
DROP POLICY IF EXISTS "Members can create vendors" ON public.vendors;
DROP POLICY IF EXISTS "Members can update vendors" ON public.vendors;
DROP POLICY IF EXISTS "Members can delete vendors" ON public.vendors;
CREATE POLICY "Scale members can view vendors" ON public.vendors FOR SELECT TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can create vendors" ON public.vendors FOR INSERT TO authenticated WITH CHECK (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can update vendors" ON public.vendors FOR UPDATE TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can delete vendors" ON public.vendors FOR DELETE TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

-- purchase_orders
DROP POLICY IF EXISTS "Members can view POs" ON public.purchase_orders;
DROP POLICY IF EXISTS "Members can create POs" ON public.purchase_orders;
DROP POLICY IF EXISTS "Members can update POs" ON public.purchase_orders;
DROP POLICY IF EXISTS "Members can delete POs" ON public.purchase_orders;
CREATE POLICY "Scale members can view POs" ON public.purchase_orders FOR SELECT TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can create POs" ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can update POs" ON public.purchase_orders FOR UPDATE TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can delete POs" ON public.purchase_orders FOR DELETE TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

-- compliance_events
DROP POLICY IF EXISTS "Members can view compliance" ON public.compliance_events;
DROP POLICY IF EXISTS "Members can create compliance" ON public.compliance_events;
DROP POLICY IF EXISTS "Members can update compliance" ON public.compliance_events;
DROP POLICY IF EXISTS "Members can delete compliance" ON public.compliance_events;
CREATE POLICY "Scale members can view compliance" ON public.compliance_events FOR SELECT TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can create compliance" ON public.compliance_events FOR INSERT TO authenticated WITH CHECK (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can update compliance" ON public.compliance_events FOR UPDATE TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can delete compliance" ON public.compliance_events FOR DELETE TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

-- branches
DROP POLICY IF EXISTS "Members can view branches" ON public.branches;
DROP POLICY IF EXISTS "Members can create branches" ON public.branches;
DROP POLICY IF EXISTS "Members can update branches" ON public.branches;
DROP POLICY IF EXISTS "Members can delete branches" ON public.branches;
CREATE POLICY "Scale members can view branches" ON public.branches FOR SELECT TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can create branches" ON public.branches FOR INSERT TO authenticated WITH CHECK (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can update branches" ON public.branches FOR UPDATE TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can delete branches" ON public.branches FOR DELETE TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

-- 3. Growth-only table policies (leads, support_tickets)
-- We wrap existing member policies with growth-access check. Fetch existing policy list and recreate.
-- leads
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='leads'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.leads', r.policyname); END LOOP;
END $$;
CREATE POLICY "Growth members can view leads" ON public.leads FOR SELECT TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_growth_access(business_id));
CREATE POLICY "Growth members can create leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (business_id = get_user_business_id(auth.uid()) AND business_has_growth_access(business_id));
CREATE POLICY "Growth members can update leads" ON public.leads FOR UPDATE TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_growth_access(business_id));
CREATE POLICY "Growth members can delete leads" ON public.leads FOR DELETE TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_growth_access(business_id));

-- support_tickets
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='support_tickets'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.support_tickets', r.policyname); END LOOP;
END $$;
CREATE POLICY "Growth members can view tickets" ON public.support_tickets FOR SELECT TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_growth_access(business_id));
CREATE POLICY "Growth members can create tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (business_id = get_user_business_id(auth.uid()) AND business_has_growth_access(business_id));
CREATE POLICY "Growth members can update tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_growth_access(business_id));
CREATE POLICY "Growth members can delete tickets" ON public.support_tickets FOR DELETE TO authenticated USING (business_id = get_user_business_id(auth.uid()) AND business_has_growth_access(business_id));

-- 4. Card scan usage tracking
CREATE TABLE public.card_scan_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  month date NOT NULL,
  scan_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, month)
);

GRANT SELECT ON public.card_scan_usage TO authenticated;
GRANT ALL ON public.card_scan_usage TO service_role;

ALTER TABLE public.card_scan_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own scan usage" ON public.card_scan_usage
  FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()));

-- Atomic increment used by edge function (service_role)
CREATE OR REPLACE FUNCTION public.increment_card_scan_usage(_business_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _month date := date_trunc('month', now())::date;
  _count integer;
BEGIN
  INSERT INTO public.card_scan_usage (business_id, month, scan_count)
  VALUES (_business_id, _month, 1)
  ON CONFLICT (business_id, month)
  DO UPDATE SET scan_count = card_scan_usage.scan_count + 1, updated_at = now()
  RETURNING scan_count INTO _count;
  RETURN _count;
END;
$$;
