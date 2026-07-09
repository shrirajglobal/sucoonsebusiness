
-- ============================================================
-- Phase 4: Fee / Installment (Scale-only)
-- ============================================================

-- ---------- fee_plans ----------
CREATE TABLE public.fee_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  plan_name text NOT NULL,
  total_amount numeric NOT NULL CHECK (total_amount > 0),
  installment_count integer NOT NULL CHECK (installment_count > 0),
  start_date date NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fee_plans_business ON public.fee_plans(business_id);
CREATE INDEX idx_fee_plans_client ON public.fee_plans(client_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_plans TO authenticated;
GRANT ALL ON public.fee_plans TO service_role;

ALTER TABLE public.fee_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scale members can view fee_plans" ON public.fee_plans
  FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can create fee_plans" ON public.fee_plans
  FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can update fee_plans" ON public.fee_plans
  FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can delete fee_plans" ON public.fee_plans
  FOR DELETE TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

CREATE TRIGGER update_fee_plans_updated_at
  BEFORE UPDATE ON public.fee_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- fee_installments ----------
CREATE TABLE public.fee_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  fee_plan_id uuid NOT NULL REFERENCES public.fee_plans(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  due_date date NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue')),
  paid_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fee_plan_id, installment_number)
);
CREATE INDEX idx_fee_installments_business ON public.fee_installments(business_id);
CREATE INDEX idx_fee_installments_plan ON public.fee_installments(fee_plan_id);
CREATE INDEX idx_fee_installments_status ON public.fee_installments(status);
CREATE INDEX idx_fee_installments_due_date ON public.fee_installments(due_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_installments TO authenticated;
GRANT ALL ON public.fee_installments TO service_role;

ALTER TABLE public.fee_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scale members can view fee_installments" ON public.fee_installments
  FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can create fee_installments" ON public.fee_installments
  FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can update fee_installments" ON public.fee_installments
  FOR UPDATE TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));
CREATE POLICY "Scale members can delete fee_installments" ON public.fee_installments
  FOR DELETE TO authenticated
  USING (business_id = get_user_business_id(auth.uid()) AND business_has_scale_access(business_id));

CREATE TRIGGER update_fee_installments_updated_at
  BEFORE UPDATE ON public.fee_installments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- RPC: create_fee_plan_with_installments ----------
CREATE OR REPLACE FUNCTION public.create_fee_plan_with_installments(
  _client_id uuid,
  _plan_name text,
  _total_amount numeric,
  _installment_count integer,
  _start_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _business_id uuid;
  _plan_id uuid;
  _total_cents bigint;
  _base_cents bigint;
  _accumulated_cents bigint := 0;
  _installment_cents bigint;
  _i integer;
BEGIN
  _business_id := public.get_user_business_id(auth.uid());
  IF _business_id IS NULL THEN
    RAISE EXCEPTION 'No business context';
  END IF;
  IF NOT public.business_has_scale_access(_business_id) THEN
    RAISE EXCEPTION 'Fee schedule requires the Scale plan';
  END IF;
  IF _total_amount IS NULL OR _total_amount <= 0 THEN
    RAISE EXCEPTION 'Total amount must be greater than zero';
  END IF;
  IF _installment_count IS NULL OR _installment_count <= 0 THEN
    RAISE EXCEPTION 'Installment count must be greater than zero';
  END IF;
  IF _start_date IS NULL THEN
    RAISE EXCEPTION 'Start date is required';
  END IF;

  INSERT INTO public.fee_plans (
    business_id, client_id, plan_name, total_amount, installment_count, start_date, created_by
  ) VALUES (
    _business_id, _client_id, _plan_name, _total_amount, _installment_count, _start_date, auth.uid()
  )
  RETURNING id INTO _plan_id;

  -- Work in integer cents to guarantee installments sum exactly to _total_amount.
  _total_cents := round(_total_amount * 100)::bigint;
  _base_cents := _total_cents / _installment_count;  -- integer division (floor for positive values)

  FOR _i IN 1.._installment_count LOOP
    IF _i < _installment_count THEN
      _installment_cents := _base_cents;
    ELSE
      -- Final installment absorbs the rounding remainder so totals reconcile.
      _installment_cents := _total_cents - _accumulated_cents;
    END IF;
    _accumulated_cents := _accumulated_cents + _installment_cents;

    INSERT INTO public.fee_installments (
      business_id, fee_plan_id, installment_number, due_date, amount, status
    ) VALUES (
      _business_id,
      _plan_id,
      _i,
      (_start_date + ((_i - 1) || ' months')::interval)::date,
      (_installment_cents::numeric / 100.0),
      'pending'
    );
  END LOOP;

  RETURN _plan_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_fee_plan_with_installments(uuid, text, numeric, integer, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_fee_plan_with_installments(uuid, text, numeric, integer, date) TO authenticated;
