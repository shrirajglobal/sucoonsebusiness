
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
  _seed_customers jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _biz_id uuid;
  _member jsonb;
  _task jsonb;
  _lead jsonb;
  _customer jsonb;
BEGIN
  -- Guard: user must not already have a business
  IF get_user_business_id(_user_id) IS NOT NULL THEN
    RAISE EXCEPTION 'User already has a business';
  END IF;

  -- 1. Create business
  INSERT INTO public.businesses (name, owner_name, phone, city, business_type, modules, pipeline_stages, task_types, tier_settings)
  VALUES (_name, _owner_name, _phone, _city, _business_type, _modules, _pipeline_stages, _task_types, _tier_settings)
  RETURNING id INTO _biz_id;

  -- 2. Link profile
  UPDATE public.profiles SET business_id = _biz_id, full_name = _owner_name, phone = _phone WHERE id = _user_id;

  -- 3. Set owner role
  INSERT INTO public.user_roles (user_id, business_id, role) VALUES (_user_id, _biz_id, 'owner');

  -- 4. Add team members
  FOR _member IN SELECT * FROM jsonb_array_elements(_members)
  LOOP
    INSERT INTO public.team_members (business_id, name) VALUES (_biz_id, _member->>'name');
  END LOOP;

  -- 5. Seed tasks
  FOR _task IN SELECT * FROM jsonb_array_elements(_seed_tasks)
  LOOP
    INSERT INTO public.tasks (business_id, title, priority, status, due_date, task_type, created_by)
    VALUES (_biz_id, _task->>'title', (_task->>'priority')::task_priority, (_task->>'status')::task_status, (_task->>'due_date')::date, _task->>'task_type', _user_id);
  END LOOP;

  -- 6. Seed leads
  FOR _lead IN SELECT * FROM jsonb_array_elements(_seed_leads)
  LOOP
    INSERT INTO public.leads (business_id, name, company, phone, value, source, stage, created_by)
    VALUES (_biz_id, _lead->>'name', _lead->>'company', _lead->>'phone', (_lead->>'value')::numeric, _lead->>'source', _lead->>'stage', _user_id);
  END LOOP;

  -- 7. Seed customers
  FOR _customer IN SELECT * FROM jsonb_array_elements(_seed_customers)
  LOOP
    INSERT INTO public.customers (business_id, name, company, phone, tier, last_contact_date, last_contact_type, lifetime_value)
    VALUES (_biz_id, _customer->>'name', _customer->>'company', _customer->>'phone', (_customer->>'tier')::customer_tier, 
            CASE WHEN _customer->>'last_contact_date' IS NOT NULL THEN (_customer->>'last_contact_date')::timestamptz ELSE NULL END,
            _customer->>'last_contact_type', COALESCE((_customer->>'lifetime_value')::numeric, 0));
  END LOOP;

  RETURN _biz_id;
END;
$$;
