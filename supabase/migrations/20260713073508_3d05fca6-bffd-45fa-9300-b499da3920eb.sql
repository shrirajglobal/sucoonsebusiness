CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(lower((auth.jwt() ->> 'email')) IN ('suvee.fashion@gmail.com','shrirajglobal@gmail.com'), false);
$$;