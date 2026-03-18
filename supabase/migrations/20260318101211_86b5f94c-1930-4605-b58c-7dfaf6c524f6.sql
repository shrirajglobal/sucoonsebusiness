
-- Drop the existing INSERT policy on businesses
DROP POLICY IF EXISTS "Authenticated users can create business" ON public.businesses;

-- Create a simpler INSERT policy that just checks the user is authenticated
-- The get_user_business_id function will return null if user has no business yet
CREATE POLICY "Authenticated users can create business" ON public.businesses
FOR INSERT TO authenticated
WITH CHECK (get_user_business_id(auth.uid()) IS NULL);
