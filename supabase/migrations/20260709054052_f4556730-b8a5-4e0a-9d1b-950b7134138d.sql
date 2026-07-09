
CREATE OR REPLACE FUNCTION public.create_partner_order_with_commission(
  _client_id uuid,
  _vendor_id uuid,
  _vendor_product_id uuid,
  _amount numeric,
  _order_date date,
  _notes text,
  _commission_amount numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _business_id uuid;
  _order_id uuid;
BEGIN
  _business_id := public.get_user_business_id(auth.uid());
  IF _business_id IS NULL THEN
    RAISE EXCEPTION 'No business context';
  END IF;
  IF NOT public.business_has_scale_access(_business_id) THEN
    RAISE EXCEPTION 'Partner Network requires the Scale plan';
  END IF;
  IF _commission_amount IS NULL OR _commission_amount < 0 THEN
    RAISE EXCEPTION 'Invalid commission amount';
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

REVOKE EXECUTE ON FUNCTION public.create_partner_order_with_commission(uuid, uuid, uuid, numeric, date, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_partner_order_with_commission(uuid, uuid, uuid, numeric, date, text, numeric) TO authenticated;
