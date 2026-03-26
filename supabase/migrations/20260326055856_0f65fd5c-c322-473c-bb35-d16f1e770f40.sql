
-- Affiliates table
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  affiliate_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  commission_rate numeric NOT NULL DEFAULT 10,
  total_clicks integer DEFAULT 0,
  total_signups integer DEFAULT 0,
  total_paid_conversions integer DEFAULT 0,
  total_commission numeric DEFAULT 0,
  payout_upi text,
  payout_bank_details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

-- Public read for affiliate lookup by code (needed for tracking clicks)
CREATE POLICY "Anyone can read affiliates by code" ON public.affiliates FOR SELECT USING (true);
-- Affiliates can insert (sign up)
CREATE POLICY "Anyone can apply as affiliate" ON public.affiliates FOR INSERT WITH CHECK (true);

-- Affiliate events table
CREATE TABLE public.affiliate_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  referred_business_id uuid,
  amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.affiliate_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read affiliate events" ON public.affiliate_events FOR SELECT USING (true);
CREATE POLICY "System can insert affiliate events" ON public.affiliate_events FOR INSERT WITH CHECK (true);

-- Add foreign keys to existing tables
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS referred_by text;
