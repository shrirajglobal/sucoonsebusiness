-- ============================================================
-- Partner Network Phase 5: migrate item selection onto the standalone
-- products master (Phase 2) instead of free-text vendor_products columns.
-- ============================================================

-- Same signature as before, so no DROP FUNCTION needed (rule only applies
-- when the argument list changes) — just derive product_id server-side from
-- the selected vendor_products row so new bills are fully product-linked
-- without any change to the Bills tab UI.
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

  IF _vendor_product_id IS NOT NULL THEN
    SELECT product_id INTO _product_id
      FROM public.vendor_products
      WHERE id = _vendor_product_id AND business_id = _business_id;
  END IF;

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
    business_id, client_id, vendor_id, vendor_product_id, product_id,
    amount, order_date, notes, created_by,
    lr_number, due_date, payment_terms, discount_amount
  ) VALUES (
    _business_id, _client_id, _vendor_id, _vendor_product_id, _product_id,
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
