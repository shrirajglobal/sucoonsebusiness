
-- Create logos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos');

-- Allow public read access to logos
CREATE POLICY "Public can view logos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'logos');

-- Allow authenticated users to update their logos
CREATE POLICY "Authenticated users can update logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'logos');

-- Create secure role assignment function
CREATE OR REPLACE FUNCTION public.assign_role(_target_user_id uuid, _business_id uuid, _new_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin or owner in this business
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND business_id = _business_id
      AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only admins and owners can assign roles';
  END IF;

  -- Prevent assigning owner role
  IF _new_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot assign owner role';
  END IF;

  -- Delete existing role and insert new one
  DELETE FROM public.user_roles WHERE user_id = _target_user_id AND business_id = _business_id;
  INSERT INTO public.user_roles (user_id, business_id, role) VALUES (_target_user_id, _business_id, _new_role);
END;
$$;
