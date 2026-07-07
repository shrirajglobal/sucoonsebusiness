
# New Pricing Model — Single Source of Truth Rollout

Three flat per-business tiers with a 90-day Growth trial for all new signups. All price/tier/user-limit/module strings become imports from one config.

---

## Step 1 — Single Source of Truth

**New file: `src/lib/pricing.ts`**

Exports:
- `PricingTierId = 'starter' | 'growth' | 'scale'`
- `BillingCycle = 'monthly' | 'annual'`
- `GST_RATE = 0.18`
- `TRIAL_DAYS = 90`
- `TRIAL_TIER: PricingTierId = 'growth'`
- `PRICING_TIERS: PricingTier[]` — for each tier: `id`, `name`, `tagline`, `monthlyPrice`, `annualPrice` (per-month equivalent when billed annually), `userLimit` (number | 'unlimited'), `modules: string[]` (module ids matching existing `ROUTE_MODULE_MAP`), `highlights: string[]`, `popular?: boolean`, `cta: string`
- Helpers: `getTier(id)`, `formatPrice(n)` → `"₹999"`, `formatPriceWithGst(n)` → `"₹999 + 18% GST"`, `getTierForModule(module)`, `canAccessModule(planId, module)`, `isPaidTier(planId)`
- `STARTER_MODULES / GROWTH_MODULES / SCALE_MODULES` constants derived from the tier config
- `CARD_SCANNER_LIMITS: Record<PricingTierId, number | 'unlimited'>` (starter: 20, others: unlimited)

Contents match the spec exactly (Starter free/1 user; Growth ₹999 monthly / ₹799 annual / 10 users; Scale ₹2,499 monthly / ₹1,999 annual / unlimited). Scale-only modules: `finance, inventory, attendance, compliance, assistant, branches`. Growth-only additions: `crm, cards (unlimited), support, team`. Starter: `tasks, ideas, contacts, cards (20/mo)`.

## Step 2 — Database

Migration:
- `ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','annual'));`
- `ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_tier text NOT NULL DEFAULT 'growth';`
- Data backfill: `UPDATE subscriptions SET plan = 'growth' WHERE plan = 'free_trial' AND status = 'active';` then keep `plan` as free text but treat values `'starter' | 'growth' | 'scale'`. Add a CHECK: `plan IN ('starter','growth','scale')`.
- `status` unchanged (`active` / `trialing` / `cancelled` / `expired`). A row on trial = `status='trialing'`, `plan='growth'`.
- No schema change needed for affiliates; commission gating happens in the `affiliate-track` edge function.

## Step 3 — Plan-based feature gating

**`src/lib/prelaunch.ts`** stays as pre-launch gate. Add a new **`src/lib/planGating.ts`**:
- `useCurrentPlan()` hook → reads the business's active subscription, returns `{ plan, billingCycle, status, trialEndsAt, isTrialing }`.
- `useCanAccessModule(module)` → combines `canAccessModule(plan, module)` + trial override (during 90-day trial, treat as Growth).
- `<PlanGate module="finance">` wrapper → if blocked, renders `<UpgradePrompt requiredTier="scale" />` instead of children.

Wire `PlanGate` into `AppLayout` route rendering (or each Scale-only page) so Starter users hitting Finance/Inventory/Attendance/Compliance/Assistant see an upgrade prompt after the trial ends. During trial, everything unlocks (trial = Growth features; Scale modules still require upgrade — spec: "Try Growth free for 90 days").

New component: **`src/components/shared/UpgradePrompt.tsx`** — reads `PRICING_TIERS`, shows required tier name + price + CTA linking to Settings → Billing.

## Step 4 — Page updates

| File | Change |
|---|---|
| `src/pages/Landing.tsx` | Rewrite pricing section (currently single ₹0 card) into 3-tier grid mapped from `PRICING_TIERS`, Growth marked "Most Popular". Add monthly/annual toggle. Replace "After pre-launch: Plans starting at ₹499/month" with "Growth from ₹799/mo (billed annually) · Scale from ₹1,999/mo". Update FAQ "Is Disha really free?" answer to describe 3-tier model + 90-day Growth trial. Keep hero/trust-bar copy. |
| `src/pages/Help.tsx` | FAQ "What happens after 90 days?" → describe 3 tiers pulling names/prices from `PRICING_TIERS`. FAQ "Is Disha free during pre-launch?" tweaked to mention 90-day Growth trial. |
| `src/pages/Settings.tsx` | Add new "Billing & Plan" tab. Shows: current tier badge, trial countdown (if trialing), user count vs `userLimit`, module list, monthly/annual toggle, per-tier cards with Upgrade/Downgrade buttons. All copy from `PRICING_TIERS`. Upgrade CTA is UI-only stub (toast "Contact support to change plan") since no payments provider yet — no Stripe/Paddle enablement in this task. |
| `src/pages/SuperAdmin.tsx` | Subscriptions tab: add `Tier` column (renders `plan`), `Billing Cycle` column, filter dropdown for tier (starter/growth/scale/all). Overview tab: add tier distribution stats (count per tier). `super-admin-data` edge function returns `plan` and `billing_cycle` already for subscriptions — no fn change needed. |
| `src/pages/ComingSoon.tsx` | If module is Scale-only (via `getTierForModule`), copy becomes "Requires the Scale plan (₹1,999/mo billed annually). Free during your 90-day trial." Otherwise keep "Part of your free 90-day trial." All strings pulled from `PRICING_TIERS`. |
| `src/pages/Onboarding.tsx` | Subscription insert becomes `{ plan: 'growth', status: 'trialing', billing_cycle: 'monthly', trial_tier: 'growth' }`. Trial length still 90 days (via existing logic / `TRIAL_DAYS`). |
| `src/components/shared/ReferralCard.tsx` | Keep WhatsApp copy. Any commission/plan strings pulled from `PRICING_TIERS` if present (currently none — verify). |
| `src/pages/AffiliateDashboard.tsx` | Commission Details section: keep dynamic `affiliate.commission_rate`. Add small note "Commission earned on Growth & Scale conversions only (Starter is free)." pulled from a `pricing.ts` constant `AFFILIATE_COMMISSION_NOTE`. |
| `supabase/functions/affiliate-track/index.ts` | On the `paid_conversion` event, verify the referred business's subscription `plan IN ('growth','scale')` before incrementing `total_paid_conversions` / `total_commission`. Starter conversions are ignored (no commission). |

## Step 5 — Grep sweep

After edits, `rg` for: `₹499`, `499/month`, `free_trial`, `per month`, `₹0`, `"90 days"` outside `pricing.ts`, `PRICING_TIERS`. Replace any stragglers with imports. Report file list at the end.

---

## Technical notes

- No payments provider is being enabled in this task — upgrade/downgrade in Settings is a UI stub. When the user is ready to accept payments, we run the eligibility check separately.
- `plan` values become the enum-like set `'starter' | 'growth' | 'scale'` (as text with a CHECK). No breaking type change for the client because `subscriptions.plan` is already `text`.
- `useCurrentPlan` derives effective features: during `status='trialing'` treat plan as Growth for gating.
- Card scanner scan-count enforcement (20/month for Starter) is out of scope here beyond exposing `CARD_SCANNER_LIMITS`; hook it into `CardScanner.tsx` in a follow-up if needed — flag in the closing summary.

## Files changed

New: `src/lib/pricing.ts`, `src/lib/planGating.ts`, `src/components/shared/UpgradePrompt.tsx`
Modified: `src/pages/Landing.tsx`, `src/pages/Help.tsx`, `src/pages/Settings.tsx`, `src/pages/SuperAdmin.tsx`, `src/pages/ComingSoon.tsx`, `src/pages/Onboarding.tsx`, `src/pages/AffiliateDashboard.tsx`, `src/components/shared/ReferralCard.tsx`, `src/components/layout/AppLayout.tsx` (PlanGate wiring), `supabase/functions/affiliate-track/index.ts`
DB: one migration on `subscriptions` (billing_cycle, trial_tier, CHECK on plan, backfill)
