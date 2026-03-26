

# Pre-Launch System: Gating, Pricing, Referral, Affiliate, Super Admin, Support & Help

This is a large, multi-phase implementation. I recommend building it in **4 phases** across multiple conversations to keep each change set manageable and testable.

---

## Phase 1 — Pre-Launch Module Gating + 90-Day Free Trial

### Database Migration

```sql
-- Subscription/trial tracking per business
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  plan text NOT NULL DEFAULT 'free_trial',
  status text NOT NULL DEFAULT 'active',
  trial_start timestamptz NOT NULL DEFAULT now(),
  trial_end timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  extra_days integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
-- RLS: business members can view their subscription
CREATE POLICY "Members can view subscription" ON public.subscriptions FOR SELECT TO authenticated
  USING (business_id = get_user_business_id(auth.uid()));
-- Only system (service role) inserts/updates subscriptions
CREATE POLICY "Service can manage subscriptions" ON public.subscriptions FOR ALL
  USING (true) WITH CHECK (true);
```

### Pre-Launch Gating Logic

**New file: `src/lib/prelaunch.ts`**
- Define `PRE_LAUNCH_MODULES` (the 6 active modules) and `COMING_SOON_MODULES` (the 11 gated ones)
- Define `SUPER_ADMIN_EMAIL = 'suvee.fashion@gmail.com'`
- Export `isModuleAvailable(module, userEmail)` — returns true if module is in pre-launch list OR user is super admin
- Export `isComingSoon(module, userEmail)` — inverse

**New page: `src/pages/ComingSoon.tsx`**
- Beautiful "Coming Soon" page with the module name, a rocket/sparkle illustration, and "We're building this for you. Stay tuned!" message
- "Go to Dashboard" button

**Modify `src/App.tsx`**
- For each gated route (attendance, forms, engagement, finance, inventory, vendors, compliance, analytics, reports, assistant, branches), wrap with a check: if `isComingSoon(module, user.email)` → render `<ComingSoon />` instead

**Modify `src/components/layout/AppLayout.tsx`**
- In the sidebar nav, for coming-soon modules: show the item but with a "Coming Soon" badge and muted styling
- Still navigable (goes to ComingSoon page) so users know what's planned

**Modify `src/pages/Onboarding.tsx`**
- After `complete_onboarding` RPC succeeds, auto-create a subscription row with 90-day trial via a separate insert

### Trial Banner
- In `AppLayout`, if subscription exists and trial is active, show a subtle top banner: "Free for 87 more days — Enjoy!"
- If trial expired (future), show upgrade prompt

---

## Phase 2 — Referral System

### Database Migration

```sql
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_business_id uuid NOT NULL,
  referrer_user_id uuid NOT NULL,
  referral_code text UNIQUE NOT NULL,
  referred_email text,
  referred_business_id uuid,
  status text NOT NULL DEFAULT 'pending', -- pending, joined, rewarded
  reward_days integer NOT NULL DEFAULT 30,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
-- Users can view their own referrals
CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT TO authenticated
  USING (referrer_user_id = auth.uid());
CREATE POLICY "System can manage referrals" ON public.referrals FOR ALL
  USING (true) WITH CHECK (true);
```

### Implementation

**Referral code generation**: On business creation (onboarding), auto-generate a unique code like `DISHA-{first4letters}-{random4}` and insert into referrals table

**New component: `src/components/shared/ReferralCard.tsx`**
- Shows referral link with the code as query param: `https://sucoonsebusiness.lovable.app/signup?ref=DISHA-XXXX`
- "Share on WhatsApp" button with pre-filled message: "Hey! I'm using Disha to manage my business — tasks, CRM, finance, all in one place. Try it free for 90 days! {link}"
- Copy link button
- Shows earned rewards: "You've earned 60 extra days from 2 referrals"

**Placement in app:**
- Settings page → new "Referral" tab
- Dashboard → small referral prompt card at bottom: "Invite a friend, get 30 days free"
- Sidebar footer → small "Invite & Earn" link

**Signup page**: Accept `?ref=` query param, store in state, pass to onboarding, record in referrals table on business creation

**Edge function: `referral-reward`** — When a referred user completes onboarding, update referral status to 'joined', add 30 days to referrer's subscription.extra_days

---

## Phase 3 — Affiliate Program + Super Admin Dashboard

### Database Migration

```sql
-- Affiliates (public-facing, no auth required to apply)
CREATE TABLE public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  affiliate_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, suspended
  commission_rate numeric NOT NULL DEFAULT 10, -- percentage
  total_clicks integer DEFAULT 0,
  total_signups integer DEFAULT 0,
  total_paid_conversions integer DEFAULT 0,
  total_commission numeric DEFAULT 0,
  payout_upi text,
  payout_bank_details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

-- Affiliate tracking events
CREATE TABLE public.affiliate_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL,
  event_type text NOT NULL, -- click, signup, paid, payout
  referred_business_id uuid,
  amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.affiliate_events ENABLE ROW LEVEL SECURITY;

-- Support tickets
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  subject text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'general', -- bug, feature, billing, general
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open', -- open, in_progress, resolved, closed
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

-- Ticket messages (conversation thread)
CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  sender_type text NOT NULL DEFAULT 'user', -- user, admin
  sender_name text NOT NULL DEFAULT '',
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view ticket messages" ON public.ticket_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_messages.ticket_id AND t.user_id = auth.uid()));
CREATE POLICY "Users can create ticket messages" ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM support_tickets t WHERE t.id = ticket_messages.ticket_id AND t.user_id = auth.uid()));
```

### Affiliate System

**Landing page**: Add "Become an Affiliate" section/link in footer
**New page: `src/pages/AffiliateSignup.tsx`** (public, no auth) — Simple form: name, email, phone, UPI ID
**New page: `src/pages/AffiliateDashboard.tsx`** (public, email/OTP login) — Shows:
- Unique affiliate link
- Total clicks, signups, paid conversions
- Commission earned, pending payout
- Share on WhatsApp / copy link
- Event history table

### Super Admin Dashboard

**New page: `src/pages/SuperAdmin.tsx`** — Only accessible by `suvee.fashion@gmail.com`
**Route**: `/super-admin` (added to App.tsx with email guard)

**Dashboard tabs:**
1. **Overview**: Total users, businesses, active trials, expired trials, revenue (future)
2. **Businesses**: List all businesses with owner, created date, plan, trial status, modules
3. **Subscriptions**: Manage plans, extend trials
4. **Referrals**: All referral activity, reward totals
5. **Affiliates**: Approve/suspend affiliates, set commission rates, view payouts
6. **Support Tickets**: View all tickets, respond, change status
7. **Settings**: Set referral reward days, affiliate commission %, coming-soon modules toggle

**Data access**: Uses service-role queries via edge functions (since RLS restricts cross-business reads)

### Edge Functions
- `super-admin-data` — Fetches cross-business data (guarded by email check)
- `super-admin-action` — Performs admin actions (approve affiliate, respond to ticket, etc.)

---

## Phase 4 — Support Tickets + Help Section

### Support Tickets (User-facing)

**New page: `src/pages/Support.tsx`**
- List of user's tickets with status badges (Open, In Progress, Resolved)
- "New Ticket" button → simple form: Subject, Category dropdown (Bug/Issue, Feature Request, Billing, Other), Description, optional screenshot upload
- Click ticket → conversation thread (WhatsApp-style chat bubbles)
- Indian user psychology: keep it simple, use Hindi-English labels where natural, prominent WhatsApp-like chat UI

**Placement**: Settings page → "Help & Support" tab, plus sidebar under System group with a LifeBuoy icon

### Help Section

**New page: `src/pages/Help.tsx`**
- Accordion-based FAQ organized by module: Dashboard, Tasks, CRM, etc.
- Each section: 3-5 common questions with clear answers
- Search bar to filter FAQs
- "Still stuck? Raise a ticket" CTA at bottom
- Video tutorial placeholders (future)

**Placement**: Same System group in sidebar, HelpCircle icon. Also accessible from the "?" floating button on mobile.

### Navigation Updates

**Sidebar nav groups (updated):**
```
Core: Dashboard, Idea Board, Tasks, CRM, Contacts, Card Scanner
Business: Attendance*, Forms*, Engagement*, Finance*, Inventory*, Vendors*, Compliance*
Advanced: Analytics*, AI Reports*, AI Assistant*, Branches*
System: Settings, Help, Support, Referral
(* = Coming Soon badge for non-super-admin)
```

**Bottom nav (mobile):** Home, Tasks, CRM, More (opens sidebar)

---

## Implementation Order (Recommended)

Given the scope, I recommend implementing across multiple conversations:

| Step | Scope | Effort |
|------|-------|--------|
| **Step 1** | Pre-launch gating + ComingSoon page + trial banner | Medium |
| **Step 2** | Referral system + WhatsApp share | Medium |
| **Step 3** | Support tickets + Help section | Medium |
| **Step 4** | Super Admin dashboard + edge functions | Large |
| **Step 5** | Affiliate program (signup + dashboard) | Large |

### Files to Create
| File | Purpose |
|------|---------|
| `src/lib/prelaunch.ts` | Module gating config |
| `src/pages/ComingSoon.tsx` | Coming Soon placeholder |
| `src/pages/Support.tsx` | Support ticket list + create |
| `src/pages/Help.tsx` | FAQ/help center |
| `src/pages/SuperAdmin.tsx` | Admin dashboard |
| `src/pages/AffiliateSignup.tsx` | Public affiliate form |
| `src/pages/AffiliateDashboard.tsx` | Affiliate tracking |
| `src/components/shared/ReferralCard.tsx` | Referral share widget |
| `supabase/functions/super-admin-data/index.ts` | Cross-business queries |
| `supabase/functions/super-admin-action/index.ts` | Admin actions |
| `supabase/functions/referral-reward/index.ts` | Referral reward logic |

### Files to Modify
| File | Change |
|------|--------|
| `src/App.tsx` | Add new routes, gating logic |
| `src/components/layout/AppLayout.tsx` | Coming Soon badges, new nav items |
| `src/pages/Settings.tsx` | Add Referral + Help & Support tabs |
| `src/pages/Dashboard.tsx` | Add referral prompt card |
| `src/pages/Signup.tsx` | Accept ?ref= param |
| `src/pages/Onboarding.tsx` | Create subscription + process referral |
| `src/pages/Landing.tsx` | Add affiliate link, update pricing section |

Shall I start with **Step 1** (pre-launch gating + trial system)?

