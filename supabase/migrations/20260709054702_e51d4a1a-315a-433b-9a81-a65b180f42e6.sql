
-- Drop the previous signature (it accepted a client-supplied commission amount).
DROP FUNCTION IF EXISTS public.create_partner_order_with_commission(uuid, uuid, uuid, numeric, date, text, numeric);

CREATE OR REPLACE FUNCTION public.create_partner_order_with_commission(
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
  _rule public.commission_rules%ROWTYPE;
  _commission_amount numeric;
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

  -- Compute commission amount server-side (mirrors calcCommission in usePartnerNetwork.ts).
  IF _rule.rate_type = 'percentage' THEN
    _commission_amount := round((_amount * _rule.rate_value / 100.0)::numeric, 2);
  ELSIF _rule.rate_type = 'flat' THEN
    _commission_amount := round(_rule.rate_value::numeric, 2);
  ELSE
    RAISE EXCEPTION 'Unknown commission rate type: %', _rule.rate_type;
  END IF;

  INSERT INTO public.partner_orders (
    business_id, client_id, vendor_id, vendor_product_id,
    amount, order_date, notes, created_by
  ) VALUES (
    _business_id, _client_id, _vendor_id, _vendor_product_id,
    _amount, COALESCE(_order_date, CURRENT_DATE), _notes, auth.uid()
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

REVOKE EXECUTE ON FUNCTION public.create_partner_order_with_commission(uuid, uuid, uuid, numeric, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_partner_order_with_commission(uuid, uuid, uuid, numeric, date, text) TO authenticated;
