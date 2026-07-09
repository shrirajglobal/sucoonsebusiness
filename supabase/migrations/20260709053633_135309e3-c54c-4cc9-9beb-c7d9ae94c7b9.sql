
-- ============================================================
-- Phase 1: Partner Network (Scale-only)
-- Additive only. Reuses business_has_scale_access() gating.
-- ============================================================

-- ---------- vendor_products ----------
CREATE TABLE public.vendor_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  category text,
  unit_price numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vendor_products_business ON public.vendor_products(business_id);
CREATE INDEX idx_vendor_products_vendor ON public.vendor_products(vendor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendor_products TO authenticated;
GRANT ALL ON public.vendor_products TO service_role;

ALTER TABLE public.vendor_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scale members can view vendor_products" ON public.vendor_products
  FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can create vendor_products" ON public.vendor_products
  FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can update vendor_products" ON public.vendor_products
  FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can delete vendor_products" ON public.vendor_products
  FOR DELETE TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

CREATE TRIGGER update_vendor_products_updated_at
  BEFORE UPDATE ON public.vendor_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- commission_rules ----------
CREATE TABLE public.commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE, -- nullable = default rule
  rate_type text NOT NULL CHECK (rate_type IN ('percentage','flat')),
  rate_value numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_commission_rules_business ON public.commission_rules(business_id);
CREATE INDEX idx_commission_rules_vendor ON public.commission_rules(vendor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_rules TO authenticated;
GRANT ALL ON public.commission_rules TO service_role;

ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scale members can view commission_rules" ON public.commission_rules
  FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can create commission_rules" ON public.commission_rules
  FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can update commission_rules" ON public.commission_rules
  FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can delete commission_rules" ON public.commission_rules
  FOR DELETE TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

CREATE TRIGGER update_commission_rules_updated_at
  BEFORE UPDATE ON public.commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- partner_orders ----------
CREATE TABLE public.partner_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  vendor_product_id uuid REFERENCES public.vendor_products(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  dispatch_status text NOT NULL DEFAULT 'pending' CHECK (dispatch_status IN ('pending','dispatched','delivered')),
  client_payment_status text NOT NULL DEFAULT 'pending' CHECK (client_payment_status IN ('pending','paid')),
  assigned_to uuid,
  created_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_partner_orders_business ON public.partner_orders(business_id);
CREATE INDEX idx_partner_orders_client ON public.partner_orders(client_id);
CREATE INDEX idx_partner_orders_vendor ON public.partner_orders(vendor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_orders TO authenticated;
GRANT ALL ON public.partner_orders TO service_role;

ALTER TABLE public.partner_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scale members can view partner_orders" ON public.partner_orders
  FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can create partner_orders" ON public.partner_orders
  FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can update partner_orders" ON public.partner_orders
  FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can delete partner_orders" ON public.partner_orders
  FOR DELETE TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

CREATE TRIGGER update_partner_orders_updated_at
  BEFORE UPDATE ON public.partner_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- commission_transactions ----------
CREATE TABLE public.commission_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  partner_order_id uuid NOT NULL REFERENCES public.partner_orders(id) ON DELETE CASCADE,
  commission_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','receivable','received','written_off')),
  receivable_since timestamptz,
  received_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_commission_transactions_business ON public.commission_transactions(business_id);
CREATE INDEX idx_commission_transactions_order ON public.commission_transactions(partner_order_id);
CREATE INDEX idx_commission_transactions_status ON public.commission_transactions(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_transactions TO authenticated;
GRANT ALL ON public.commission_transactions TO service_role;

ALTER TABLE public.commission_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scale members can view commission_transactions" ON public.commission_transactions
  FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can create commission_transactions" ON public.commission_transactions
  FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can update commission_transactions" ON public.commission_transactions
  FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can delete commission_transactions" ON public.commission_transactions
  FOR DELETE TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

CREATE TRIGGER update_commission_transactions_updated_at
  BEFORE UPDATE ON public.commission_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- Trigger: partner_orders paid -> commission receivable ----------
CREATE OR REPLACE FUNCTION public.handle_partner_order_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_payment_status = 'paid'
     AND (OLD.client_payment_status IS DISTINCT FROM NEW.client_payment_status) THEN
    UPDATE public.commission_transactions
      SET status = 'receivable',
          receivable_since = now(),
          updated_at = now()
      WHERE partner_order_id = NEW.id
        AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER partner_order_payment_status_change
  AFTER UPDATE OF client_payment_status ON public.partner_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_partner_order_paid();

-- ---------- View: client_vendor_balances ----------
CREATE OR REPLACE VIEW public.client_vendor_balances
WITH (security_invoker = true) AS
SELECT
  po.business_id,
  po.client_id,
  po.vendor_id,
  COALESCE(SUM(po.amount), 0) AS total_order_value,
  COALESCE(SUM(CASE WHEN po.client_payment_status = 'paid' THEN po.amount ELSE 0 END), 0) AS total_paid,
  COALESCE(SUM(CASE WHEN ct.status = 'pending' THEN ct.commission_amount ELSE 0 END), 0) AS commission_pending,
  COALESCE(SUM(CASE WHEN ct.status = 'receivable' THEN ct.commission_amount ELSE 0 END), 0) AS commission_receivable,
  COALESCE(SUM(CASE WHEN ct.status = 'received' THEN ct.commission_amount ELSE 0 END), 0) AS commission_received
FROM public.partner_orders po
LEFT JOIN public.commission_transactions ct ON ct.partner_order_id = po.id
GROUP BY po.business_id, po.client_id, po.vendor_id;

GRANT SELECT ON public.client_vendor_balances TO authenticated;
GRANT ALL ON public.client_vendor_balances TO service_role;
