-- ============================================================
-- Partner Network Phase 4: bill fields, audited commission override
-- ============================================================

-- ---------- 1. New invoice fields on partner_orders ("Bills") ----------
ALTER TABLE public.partner_orders
  ADD COLUMN lr_number text,
  ADD COLUMN due_date date,
  ADD COLUMN payment_terms text,
  ADD COLUMN discount_amount numeric NOT NULL DEFAULT 0;

ALTER TABLE public.partner_orders
  ADD CONSTRAINT partner_orders_payment_terms_check
  CHECK (payment_terms IS NULL OR payment_terms IN ('advance','immediate','7_days','15_days','30_days','45_days','60_days'));

ALTER TABLE public.partner_orders
  ADD CONSTRAINT partner_orders_discount_amount_check
  CHECK (discount_amount >= 0 AND discount_amount <= amount);

-- ---------- 2. Audited commission override ----------
CREATE TABLE public.commission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  commission_transaction_id uuid NOT NULL REFERENCES public.commission_transactions(id) ON DELETE CASCADE,
  previous_amount numeric NOT NULL,
  new_amount numeric NOT NULL,
  reason text NOT NULL,
  overridden_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_commission_overrides_business ON public.commission_overrides(business_id);
CREATE INDEX idx_commission_overrides_transaction ON public.commission_overrides(commission_transaction_id);

-- Read-only audit log for clients — all writes go through override_commission_amount().
GRANT SELECT ON public.commission_overrides TO authenticated;
GRANT ALL ON public.commission_overrides TO service_role;

ALTER TABLE public.commission_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scale members can view commission_overrides" ON public.commission_overrides
  FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

-- Prevent direct edits to commission_amount from the client — must go through
-- override_commission_amount(), which logs to commission_overrides.
REVOKE UPDATE ON public.commission_transactions FROM authenticated;
GRANT UPDATE (status, received_date, notes) ON public.commission_transactions TO authenticated;

CREATE OR REPLACE FUNCTION public.override_commission_amount(
  _transaction_id uuid,
  _new_amount numeric,
  _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _txn public.commission_transactions%ROWTYPE;
  _caller_business_id uuid;
BEGIN
  IF _new_amount IS NULL OR _new_amount < 0 THEN
    RAISE EXCEPTION 'New commission amount must be zero or greater';
  END IF;
  IF _reason IS NULL OR length(trim(_reason)) = 0 THEN
    RAISE EXCEPTION 'A reason is required to override a commission amount';
  END IF;

  SELECT * INTO _txn FROM public.commission_transactions WHERE id = _transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commission transaction not found';
  END IF;

  _caller_business_id := public.get_user_business_id(auth.uid());
  IF _caller_business_id IS NULL OR _caller_business_id != _txn.business_id THEN
    RAISE EXCEPTION 'Not authorized for this business';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND business_id = _txn.business_id
      AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only owners and admins can override commission amounts';
  END IF;

  INSERT INTO public.commission_overrides (
    business_id, commission_transaction_id, previous_amount, new_amount, reason, overridden_by
  ) VALUES (
    _txn.business_id, _transaction_id, _txn.commission_amount, _new_amount, trim(_reason), auth.uid()
  );

  UPDATE public.commission_transactions
     SET commission_amount = _new_amount,
         updated_at = now()
   WHERE id = _transaction_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.override_commission_amount(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.override_commission_amount(uuid, numeric, text) TO authenticated;

-- ---------- 3. Extend create_partner_order_with_commission for bill fields + discount ----------
-- CREATE OR REPLACE with a different argument list creates a new overload rather than
-- replacing the old one — drop the superseded 6-arg signature explicitly.
DROP FUNCTION IF EXISTS public.create_partner_order_with_commission(uuid, uuid, uuid, numeric, date, text);

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
  _rule public.commission_rules%ROWTYPE;
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

  -- Resolve applicable commission rule: vendor-specific first, else business default (vendor_id IS NULL).
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

  -- Commission is calculated on the net (post-discount) bill amount.
  IF _rule.rate_type = 'percentage' THEN
    _commission_amount := round((_net_amount * _rule.rate_value / 100.0)::numeric, 2);
  ELSIF _rule.rate_type = 'flat' THEN
    _commission_amount := round(_rule.rate_value::numeric, 2);
  ELSE
    RAISE EXCEPTION 'Unknown commission rate type: %', _rule.rate_type;
  END IF;

  INSERT INTO public.partner_orders (
    business_id, client_id, vendor_id, vendor_product_id,
    amount, order_date, notes, created_by,
    lr_number, due_date, payment_terms, discount_amount
  ) VALUES (
    _business_id, _client_id, _vendor_id, _vendor_product_id,
    _amount, COALESCE(_order_date, CURRENT_DATE), _notes, auth.uid(),
    _lr_number, _due_date, _payment_terms, _discount
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

REVOKE EXECUTE ON FUNCTION public.create_partner_order_with_commission(uuid, uuid, uuid, numeric, date, text, text, date, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_partner_order_with_commission(uuid, uuid, uuid, numeric, date, text, text, date, text, numeric) TO authenticated;
