
-- Extract installment rounding into a shared helper so onboarding seed and
-- create_fee_plan_with_installments share the exact same math.
CREATE OR REPLACE FUNCTION public.generate_fee_installments(
  _business_id uuid,
  _plan_id uuid,
  _total_amount numeric,
  _installment_count integer,
  _start_date date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _total_cents bigint;
  _base_cents bigint;
  _accumulated_cents bigint := 0;
  _installment_cents bigint;
  _i integer;
BEGIN
  IF _total_amount IS NULL OR _total_amount <= 0 THEN
    RAISE EXCEPTION 'Total amount must be greater than zero';
  END IF;
  IF _installment_count IS NULL OR _installment_count <= 0 THEN
    RAISE EXCEPTION 'Installment count must be greater than zero';
  END IF;
  IF _start_date IS NULL THEN
    RAISE EXCEPTION 'Start date is required';
  END IF;

  _total_cents := round(_total_amount * 100)::bigint;
  _base_cents := _total_cents / _installment_count;

  FOR _i IN 1.._installment_count LOOP
    IF _i < _installment_count THEN
      _installment_cents := _base_cents;
    ELSE
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
END;
$$;

-- Update create_fee_plan_with_installments to delegate to the shared helper.
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
SET search_path TO 'public'
AS $$
DECLARE
  _business_id uuid;
  _plan_id uuid;
BEGIN
  _business_id := public.get_user_business_id(auth.uid());
  IF _business_id IS NULL THEN
    RAISE EXCEPTION 'No business context';
  END IF;
  IF NOT public.business_has_scale_access(_business_id) THEN
    RAISE EXCEPTION 'Fee schedule requires the Scale plan';
  END IF;

  INSERT INTO public.fee_plans (
    business_id, client_id, plan_name, total_amount, installment_count, start_date, created_by
  ) VALUES (
    _business_id, _client_id, _plan_name, _total_amount, _installment_count, _start_date, auth.uid()
  )
  RETURNING id INTO _plan_id;

  PERFORM public.generate_fee_installments(_business_id, _plan_id, _total_amount, _installment_count, _start_date);
  RETURN _plan_id;
END;
$$;

-- Extend complete_onboarding with an optional _seed_fee_plan parameter.
-- Existing verticals pass NULL and see identical behavior.
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  _name text,
  _owner_name text,
  _phone text,
  _city text,
  _business_type text,
  _modules text[],
  _pipeline_stages text[],
  _task_types text[],
  _tier_settings jsonb,
  _members jsonb DEFAULT '[]'::jsonb,
  _seed_tasks jsonb DEFAULT '[]'::jsonb,
  _seed_leads jsonb DEFAULT '[]'::jsonb,
  _seed_customers jsonb DEFAULT '[]'::jsonb,
  _seed_partner_network jsonb DEFAULT NULL::jsonb,
  _seed_fee_plan jsonb DEFAULT NULL::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _biz_id uuid;
  _member jsonb;
  _task jsonb;
  _lead jsonb;
  _customer jsonb;
BEGIN
  IF get_user_business_id(_user_id) IS NOT NULL THEN
    RAISE EXCEPTION 'User already has a business';
  END IF;

  INSERT INTO public.businesses (name, owner_name, phone, city, business_type, modules, pipeline_stages, task_types, tier_settings)
  VALUES (_name, _owner_name, _phone, _city, _business_type, _modules, _pipeline_stages, _task_types, _tier_settings)
  RETURNING id INTO _biz_id;

  UPDATE public.profiles SET business_id = _biz_id, full_name = _owner_name, phone = _phone WHERE id = _user_id;

  INSERT INTO public.user_roles (user_id, business_id, role) VALUES (_user_id, _biz_id, 'owner');

  FOR _member IN SELECT * FROM jsonb_array_elements(_members) LOOP
    INSERT INTO public.team_members (business_id, name) VALUES (_biz_id, _member->>'name');
  END LOOP;

  FOR _task IN SELECT * FROM jsonb_array_elements(_seed_tasks) LOOP
    INSERT INTO public.tasks (business_id, title, priority, status, due_date, task_type, created_by)
    VALUES (_biz_id, _task->>'title', (_task->>'priority')::task_priority, (_task->>'status')::task_status, (_task->>'due_date')::date, _task->>'task_type', _user_id);
  END LOOP;

  FOR _lead IN SELECT * FROM jsonb_array_elements(_seed_leads) LOOP
    INSERT INTO public.leads (business_id, name, company, phone, value, source, stage, created_by)
    VALUES (_biz_id, _lead->>'name', _lead->>'company', _lead->>'phone', (_lead->>'value')::numeric, _lead->>'source', _lead->>'stage', _user_id);
  END LOOP;

  FOR _customer IN SELECT * FROM jsonb_array_elements(_seed_customers) LOOP
    INSERT INTO public.customers (business_id, name, company, phone, tier, last_contact_date, last_contact_type, lifetime_value)
    VALUES (_biz_id, _customer->>'name', _customer->>'company', _customer->>'phone', (_customer->>'tier')::customer_tier,
            CASE WHEN _customer->>'last_contact_date' IS NOT NULL THEN (_customer->>'last_contact_date')::timestamptz ELSE NULL END,
            _customer->>'last_contact_type', COALESCE((_customer->>'lifetime_value')::numeric, 0));
  END LOOP;

  -- Partner Network seeding (unchanged from Phase 3)
  IF _seed_partner_network IS NOT NULL THEN
    DECLARE
      _rule jsonb := _seed_partner_network->'commission_rule';
      _vendor_rec jsonb;
      _product_rec jsonb;
      _client_rec jsonb := _seed_partner_network->'sample_client';
      _order_rec jsonb := _seed_partner_network->'sample_order';
      _vendor_ids uuid[] := ARRAY[]::uuid[];
      _product_ids uuid[] := ARRAY[]::uuid[];
      _vid uuid;
      _pid uuid;
      _sample_client_id uuid;
      _order_id uuid;
      _commission numeric;
    BEGIN
      IF _rule IS NOT NULL THEN
        INSERT INTO public.commission_rules (business_id, vendor_id, rate_type, rate_value)
        VALUES (_biz_id, NULL, _rule->>'rate_type', (_rule->>'rate_value')::numeric);
      END IF;

      FOR _vendor_rec IN SELECT * FROM jsonb_array_elements(COALESCE(_seed_partner_network->'vendors', '[]'::jsonb)) LOOP
        INSERT INTO public.vendors (business_id, name, phone, company)
        VALUES (_biz_id, _vendor_rec->>'name', _vendor_rec->>'phone', _vendor_rec->>'company')
        RETURNING id INTO _vid;
        _vendor_ids := _vendor_ids || _vid;
      END LOOP;

      FOR _product_rec IN SELECT * FROM jsonb_array_elements(COALESCE(_seed_partner_network->'vendor_products', '[]'::jsonb)) LOOP
        IF array_length(_vendor_ids, 1) >= ((_product_rec->>'vendor_index')::int + 1) THEN
          INSERT INTO public.vendor_products (business_id, vendor_id, product_name, category, unit_price)
          VALUES (
            _biz_id,
            _vendor_ids[(_product_rec->>'vendor_index')::int + 1],
            _product_rec->>'product_name',
            _product_rec->>'category',
            NULLIF(_product_rec->>'unit_price','')::numeric
          )
          RETURNING id INTO _pid;
          _product_ids := _product_ids || _pid;
        END IF;
      END LOOP;

      IF _client_rec IS NOT NULL THEN
        INSERT INTO public.customers (business_id, name, company, phone, tier, lifetime_value)
        VALUES (
          _biz_id,
          _client_rec->>'name',
          _client_rec->>'company',
          _client_rec->>'phone',
          COALESCE((_client_rec->>'tier')::customer_tier, 'B'::customer_tier),
          COALESCE(NULLIF(_client_rec->>'lifetime_value','')::numeric, 0)
        )
        RETURNING id INTO _sample_client_id;
      END IF;

      IF _order_rec IS NOT NULL
         AND _sample_client_id IS NOT NULL
         AND array_length(_vendor_ids, 1) >= ((_order_rec->>'vendor_index')::int + 1)
         AND _rule IS NOT NULL THEN

        IF (_rule->>'rate_type') = 'percentage' THEN
          _commission := round(((_order_rec->>'amount')::numeric * (_rule->>'rate_value')::numeric / 100.0)::numeric, 2);
        ELSE
          _commission := round((_rule->>'rate_value')::numeric, 2);
        END IF;

        INSERT INTO public.partner_orders (
          business_id, client_id, vendor_id, vendor_product_id,
          amount, order_date, notes, created_by
        )
        VALUES (
          _biz_id,
          _sample_client_id,
          _vendor_ids[(_order_rec->>'vendor_index')::int + 1],
          CASE
            WHEN _order_rec ? 'product_index'
             AND array_length(_product_ids, 1) >= ((_order_rec->>'product_index')::int + 1)
            THEN _product_ids[(_order_rec->>'product_index')::int + 1]
            ELSE NULL
          END,
          (_order_rec->>'amount')::numeric,
          COALESCE((_order_rec->>'order_date')::date, CURRENT_DATE),
          _order_rec->>'notes',
          _user_id
        )
        RETURNING id INTO _order_id;

        INSERT INTO public.commission_transactions (business_id, partner_order_id, commission_amount, status)
        VALUES (_biz_id, _order_id, _commission, 'pending');
      END IF;
    END;
  END IF;

  -- Fee Plan seeding (Education vertical). Reuses generate_fee_installments
  -- so rounding math lives in exactly one place.
  IF _seed_fee_plan IS NOT NULL THEN
    DECLARE
      _fp_client jsonb := _seed_fee_plan->'sample_client';
      _fp_plan jsonb := _seed_fee_plan->'plan';
      _fp_client_id uuid;
      _fp_plan_id uuid;
      _fp_total numeric;
      _fp_count integer;
      _fp_start date;
    BEGIN
      IF _fp_client IS NOT NULL AND _fp_plan IS NOT NULL THEN
        INSERT INTO public.customers (business_id, name, company, phone, tier, lifetime_value)
        VALUES (
          _biz_id,
          _fp_client->>'name',
          _fp_client->>'company',
          _fp_client->>'phone',
          COALESCE((_fp_client->>'tier')::customer_tier, 'B'::customer_tier),
          COALESCE(NULLIF(_fp_client->>'lifetime_value','')::numeric, 0)
        )
        RETURNING id INTO _fp_client_id;

        _fp_total := (_fp_plan->>'total_amount')::numeric;
        _fp_count := (_fp_plan->>'installment_count')::integer;
        _fp_start := COALESCE((_fp_plan->>'start_date')::date, CURRENT_DATE);

        INSERT INTO public.fee_plans (
          business_id, client_id, plan_name, total_amount, installment_count, start_date, created_by
        ) VALUES (
          _biz_id, _fp_client_id, _fp_plan->>'plan_name', _fp_total, _fp_count, _fp_start, _user_id
        )
        RETURNING id INTO _fp_plan_id;

        PERFORM public.generate_fee_installments(_biz_id, _fp_plan_id, _fp_total, _fp_count, _fp_start);
      END IF;
    END;
  END IF;

  RETURN _biz_id;
END;
$$;
