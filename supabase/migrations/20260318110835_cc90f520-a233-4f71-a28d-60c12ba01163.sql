
-- Contacts table
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  company text,
  designation text,
  phone text,
  email text,
  address text,
  website text,
  notes text,
  source text DEFAULT 'manual',
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view contacts" ON public.contacts FOR SELECT USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can create contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can update contacts" ON public.contacts FOR UPDATE USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can delete contacts" ON public.contacts FOR DELETE USING (business_id = get_user_business_id(auth.uid()));

-- Card scans table
CREATE TABLE public.card_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  image_url text,
  extracted_data jsonb DEFAULT '{}'::jsonb,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  scanned_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.card_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view card scans" ON public.card_scans FOR SELECT USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can create card scans" ON public.card_scans FOR INSERT TO authenticated WITH CHECK (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Members can delete card scans" ON public.card_scans FOR DELETE USING (business_id = get_user_business_id(auth.uid()));

-- Storage bucket for card images
INSERT INTO storage.buckets (id, name, public) VALUES ('card-scans', 'card-scans', true);

CREATE POLICY "Authenticated users can upload card scans" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'card-scans');
CREATE POLICY "Anyone can view card scans" ON storage.objects FOR SELECT USING (bucket_id = 'card-scans');
CREATE POLICY "Users can delete own card scans" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'card-scans');
