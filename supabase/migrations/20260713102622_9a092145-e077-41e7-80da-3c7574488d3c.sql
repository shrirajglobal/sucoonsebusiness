
-- ============================================================
-- Phase 7: Order → Invoice, master data extensions, opening balance
-- ============================================================

-- ---------- 1. Master field additions ----------
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS default_payment_terms text,
  ADD COLUMN IF NOT EXISTS default_discount_percent numeric,
  ADD COLUMN IF NOT EXISTS opening_balance numeric NOT NULL DEFAULT 0;

ALTER TABLE public.vendors
  DROP CONSTRAINT IF EXISTS vendors_default_payment_terms_check;
ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_default_payment_terms_check
  CHECK (default_payment_terms IS NULL OR default_payment_terms IN
    ('advance','immediate','7_days','15_days','30_days','45_days','60_days'));

ALTER TABLE public.vendors
  DROP CONSTRAINT IF EXISTS vendors_default_discount_percent_check;
ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_default_discount_percent_check
  CHECK (default_discount_percent IS NULL OR (default_discount_percent >= 0 AND default_discount_percent <= 100));

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS opening_balance numeric NOT NULL DEFAULT 0;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'product';

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_item_type_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_item_type_check
  CHECK (item_type IN ('product','service'));

-- ---------- 2. partner_orders.order_stage ----------
ALTER TABLE public.partner_orders
  ADD COLUMN IF NOT EXISTS order_stage text NOT NULL DEFAULT 'invoiced';

ALTER TABLE public.partner_orders
  DROP CONSTRAINT IF EXISTS partner_orders_order_stage_check;
ALTER TABLE public.partner_orders
  ADD CONSTRAINT partner_orders_order_stage_check
  CHECK (order_stage IN ('order_placed','invoiced'));

-- ---------- 3. Shared commission calculation ----------
-- One place for commission math, called from both the direct-bill RPC and
-- the invoice-from-order RPC. Rule resolution mirrors the pre-existing
-- vendor-specific-then-default lookup used in Phase 6.
CREATE OR REPLACE FUNCTION public.calculate_commission_for_rule(
  _business_id uuid,
  _vendor_id uuid,
  _net_amount numeric
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rule public.commission_rules%ROWTYPE;
BEGIN
  IF _net_amount IS NULL OR _net_amount < 0 THEN
    RAISE EXCEPTION 'Net amount must be zero or greater';
  END IF;

  SELECT * INTO _rule
    FROM public.commission_rules
    WHERE business_id = _business_id AND vendor_id = _vendor_id
    LIMIT 1;

  IF NOT FOUND THEN
    SELECT * INTO _rule
      FROM public.commission_rules
      WHERE business_id = _business_id AND vendor_id IS NULL
      LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Set a commission rate for this vendor before creating orders';
  END IF;

  IF _rule.rate_type = 'percentage' THEN
    RETURN round((_net_amount * _rule.rate_value / 100.0)::numeric, 2);
  ELSIF _rule.rate_type = 'flat' THEN
    RETURN round(_rule.rate_value::numeric, 2);
  ELSE
    RAISE EXCEPTION 'Unknown commission rate type: %', _rule.rate_type;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_commission_for_rule(uuid, uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_commission_for_rule(uuid, uuid, numeric) TO authenticated;

-- ---------- 4. Refactor create_partner_order_with_commission ----------
-- Same signature. Now delegates commission math to the shared helper. Direct
-- "New Bill" flow keeps writing order_stage = 'invoiced' (the column default).
CREATE OR REPLACE FUNCTION public.create_partner_order_with_commission(
  _client_id uuid,
  _vendor_id uuid,
  _vendor_product_id uuid,
  _amount numeric,
  _order_date date,
  _notes text,
  _lr_number text DEFAULT NULL,
  _due_date date DEFAULT NULL,
  _payment_terms text DEFAULT NULL,
  _discount_amount numeric DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _business_id uuid;
  _order_id uuid;
  _product_id uuid;
  _commission_amount numeric;
  _net_amount numeric;
  _discount numeric := COALESCE(_discount_amount, 0);
BEGIN
  _business_id := public.get_user_business_id(auth.uid());
  IF _business_id IS NULL THEN
    RAISE EXCEPTION 'No business context';
  END IF;
  IF NOT public.business_has_scale_access(_business_id) THEN
    RAISE EXCEPTION 'Partner Network requires the Scale plan';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Order amount must be greater than zero';
  END IF;
  IF _discount < 0 OR _discount > _amount THEN
    RAISE EXCEPTION 'Discount must be between zero and the bill amount';
  END IF;

  _net_amount := _amount - _discount;

  IF _vendor_product_id IS NOT NULL THEN
    SELECT product_id INTO _product_id
      FROM public.vendor_products
      WHERE id = _vendor_product_id AND business_id = _business_id;
  END IF;

  _commission_amount := public.calculate_commission_for_rule(_business_id, _vendor_id, _net_amount);

  INSERT INTO public.partner_orders (
    business_id, client_id, vendor_id, product_id,
    amount, order_date, notes, created_by,
    lr_number, due_date, payment_terms, discount_amount,
    order_stage
  ) VALUES (
    _business_id, _client_id, _vendor_id, _product_id,
    _amount, COALESCE(_order_date, CURRENT_DATE), _notes, auth.uid(),
    _lr_number, _due_date, _payment_terms, _discount,
    'invoiced'
  )
  RETURNING id INTO _order_id;

  INSERT INTO public.commission_transactions (
    business_id, partner_order_id, commission_amount, status
  ) VALUES (
    _business_id, _order_id, _commission_amount, 'pending'
  );

  RETURN _order_id;
END;
$$;

-- ---------- 5. Log an order (no invoice, no commission yet) ----------
CREATE OR REPLACE FUNCTION public.create_partner_order_placed(
  _client_id uuid,
  _vendor_id uuid,
  _vendor_product_id uuid,
  _amount numeric,
  _order_date date,
  _notes text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _business_id uuid;
  _order_id uuid;
  _product_id uuid;
BEGIN
  _business_id := public.get_user_business_id(auth.uid());
  IF _business_id IS NULL THEN
    RAISE EXCEPTION 'No business context';
  END IF;
  IF NOT public.business_has_scale_access(_business_id) THEN
    RAISE EXCEPTION 'Partner Network requires the Scale plan';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Expected amount must be greater than zero';
  END IF;

  IF _vendor_product_id IS NOT NULL THEN
    SELECT product_id INTO _product_id
      FROM public.vendor_products
      WHERE id = _vendor_product_id AND business_id = _business_id;
  END IF;

  INSERT INTO public.partner_orders (
    business_id, client_id, vendor_id, product_id,
    amount, order_date, notes, created_by, order_stage
  ) VALUES (
    _business_id, _client_id, _vendor_id, _product_id,
    _amount, COALESCE(_order_date, CURRENT_DATE), _notes, auth.uid(), 'order_placed'
  )
  RETURNING id INTO _order_id;

  RETURN _order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_partner_order_placed(uuid, uuid, uuid, numeric, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_partner_order_placed(uuid, uuid, uuid, numeric, date, text) TO authenticated;

-- ---------- 6. Generate invoice for a logged order ----------
CREATE OR REPLACE FUNCTION public.generate_invoice_for_order(
  _order_id uuid,
  _lr_number text,
  _due_date date,
  _payment_terms text,
  _discount_amount numeric,
  _final_amount numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order public.partner_orders%ROWTYPE;
  _business_id uuid;
  _discount numeric := COALESCE(_discount_amount, 0);
  _amount numeric;
  _net_amount numeric;
  _commission_amount numeric;
BEGIN
  _business_id := public.get_user_business_id(auth.uid());
  IF _business_id IS NULL THEN
    RAISE EXCEPTION 'No business context';
  END IF;
  IF NOT public.business_has_scale_access(_business_id) THEN
    RAISE EXCEPTION 'Partner Network requires the Scale plan';
  END IF;

  SELECT * INTO _order
    FROM public.partner_orders
    WHERE id = _order_id AND business_id = _business_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF _order.order_stage = 'invoiced' THEN
    RAISE EXCEPTION 'Order is already invoiced';
  END IF;

  _amount := COALESCE(_final_amount, _order.amount);
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Bill amount must be greater than zero';
  END IF;
  IF _discount < 0 OR _discount > _amount THEN
    RAISE EXCEPTION 'Discount must be between zero and the bill amount';
  END IF;

  _net_amount := _amount - _discount;
  _commission_amount := public.calculate_commission_for_rule(_business_id, _order.vendor_id, _net_amount);

  UPDATE public.partner_orders
     SET amount = _amount,
         lr_number = _lr_number,
         due_date = _due_date,
         payment_terms = _payment_terms,
         discount_amount = _discount,
         order_stage = 'invoiced',
         updated_at = now()
   WHERE id = _order_id;

  INSERT INTO public.commission_transactions (
    business_id, partner_order_id, commission_amount, status
  ) VALUES (
    _business_id, _order_id, _commission_amount, 'pending'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.generate_invoice_for_order(uuid, text, date, text, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_invoice_for_order(uuid, text, date, text, numeric, numeric) TO authenticated;

-- ---------- 7. client_vendor_balances: include client opening balance ----------
CREATE OR REPLACE VIEW public.client_vendor_balances
WITH (security_invoker = true) AS
SELECT
  po.business_id,
  po.client_id,
  po.vendor_id,
  COALESCE(SUM(CASE WHEN po.order_stage = 'invoiced' THEN po.amount ELSE 0 END), 0) AS total_order_value,
  COALESCE(SUM(CASE WHEN po.order_stage = 'invoiced' AND po.client_payment_status = 'paid' THEN po.amount ELSE 0 END), 0) AS total_paid,
  COALESCE(SUM(CASE WHEN ct.status = 'pending' THEN ct.commission_amount ELSE 0 END), 0) AS commission_pending,
  COALESCE(SUM(CASE WHEN ct.status = 'receivable' THEN ct.commission_amount ELSE 0 END), 0) AS commission_receivable,
  COALESCE(SUM(CASE WHEN ct.status = 'received' THEN ct.commission_amount ELSE 0 END), 0) AS commission_received,
  COALESCE(MAX(c.opening_balance), 0) AS client_opening_balance
FROM public.partner_orders po
LEFT JOIN public.commission_transactions ct ON ct.partner_order_id = po.id
LEFT JOIN public.customers c ON c.id = po.client_id
GROUP BY po.business_id, po.client_id, po.vendor_id;

GRANT SELECT ON public.client_vendor_balances TO authenticated;
GRANT ALL ON public.client_vendor_balances TO service_role;
