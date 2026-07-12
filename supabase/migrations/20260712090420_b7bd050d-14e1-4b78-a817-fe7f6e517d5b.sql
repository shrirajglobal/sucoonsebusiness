CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tm_row public.team_members%ROWTYPE;
  _invited_role app_role;
  _email text := lower(NEW.email);
BEGIN
  -- Look up a pending invite by email (case-insensitive)
  SELECT * INTO _tm_row
    FROM public.team_members
    WHERE lower(email) = _email
      AND user_id IS NULL
    ORDER BY created_at ASC
    LIMIT 1;

  IF FOUND THEN
    -- Resolve invited role from user metadata; default to 'executive'
    BEGIN
      _invited_role := COALESCE(
        (NEW.raw_user_meta_data->>'invited_role')::app_role,
        'executive'::app_role
      );
    EXCEPTION WHEN others THEN
      _invited_role := 'executive'::app_role;
    END;

    -- Never allow auto-provisioning as owner via invite metadata
    IF _invited_role = 'owner' THEN
      _invited_role := 'admin';
    END IF;

    INSERT INTO public.profiles (id, full_name, phone, business_id)
    VALUES (
      NEW.id,
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), _tm_row.name, NEW.email),
      _tm_row.phone,
      _tm_row.business_id
    );

    UPDATE public.team_members
       SET user_id = NEW.id
     WHERE id = _tm_row.id;

    INSERT INTO public.user_roles (user_id, business_id, role)
    VALUES (NEW.id, _tm_row.business_id, _invited_role)
    ON CONFLICT (user_id, business_id) DO NOTHING;
  ELSE
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  END IF;

  RETURN NEW;
END;
$$;