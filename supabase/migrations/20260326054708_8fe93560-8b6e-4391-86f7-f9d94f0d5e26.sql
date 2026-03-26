
-- Subscription/trial tracking per business
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free_trial',
  status text NOT NULL DEFAULT 'active',
  trial_start timestamptz NOT NULL DEFAULT now(),
  trial_end timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  extra_days integer NOT NULL DEFAULT 0,
  referred_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view subscription" ON public.subscriptions FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "System can insert subscriptions" ON public.subscriptions FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id(auth.uid()));

-- Referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  referrer_user_id uuid NOT NULL,
  referral_code text UNIQUE NOT NULL,
  referred_email text,
  referred_business_id uuid REFERENCES public.businesses(id),
  status text NOT NULL DEFAULT 'pending',
  reward_days integer NOT NULL DEFAULT 30,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT TO authenticated
  USING (referrer_user_id = auth.uid());
CREATE POLICY "Users can create referrals" ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (referrer_user_id = auth.uid());

-- Support tickets
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  subject text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tickets" ON public.support_tickets FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can create tickets" ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (business_id = get_user_business_id(auth.uid()));
CREATE POLICY "Users can update own tickets" ON public.support_tickets FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Ticket messages
CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type text NOT NULL DEFAULT 'user',
  sender_name text NOT NULL DEFAULT '',
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view ticket messages" ON public.ticket_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_messages.ticket_id AND t.user_id = auth.uid()));
CREATE POLICY "Users can create ticket messages" ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_messages.ticket_id AND t.user_id = auth.uid()));

-- Add referral_code to profiles for easy lookup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
