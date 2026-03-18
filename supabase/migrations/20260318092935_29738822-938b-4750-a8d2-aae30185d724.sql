
-- Fix overly permissive business INSERT policy
-- Users should only create businesses during onboarding (still need authenticated)
DROP POLICY "Authenticated users can create business" ON public.businesses;
CREATE POLICY "Authenticated users can create business" ON public.businesses 
  FOR INSERT TO authenticated 
  WITH CHECK (
    NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND business_id IS NOT NULL)
  );

-- Fix overly permissive form_responses INSERT policy  
DROP POLICY "Anyone can submit form response" ON public.form_responses;
CREATE POLICY "Authenticated users can submit form response" ON public.form_responses 
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.forms f WHERE f.id = form_id AND f.is_active = true)
  );
