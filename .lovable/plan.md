# Fix: Partner Network is invisible / locked in your workspace

## Why it's happening

Two independent gates are hiding it:

1. **Sidebar filter** (`src/components/layout/AppLayout.tsx:63`): `partner_network` is not in the `alwaysShow` list. It only appears if the business's `businesses.modules` array contains `'partner_network'` — which is seeded only for Agency / Real Estate / Finance verticals during onboarding. Any other vertical never sees the link, even on Scale.
2. **Plan gate** (`src/lib/pricing.ts`): `partner_network` lives only in `SCALE_MODULES`. The 90-day trial grants **Growth** access, so `<PlanGate module="partner_network">` shows the upgrade prompt to trial users — including Agency businesses that just onboarded.

Fee Schedule has the same shape (Scale-only, module-flag gated) so it will get the same treatment.

## Changes

### 1. Always show vertical modules in the sidebar
`src/components/layout/AppLayout.tsx`
- Add `'partner_network'` and `'fee_schedule'` to the `alwaysShow` array. `<PlanGate>` on the route still enforces access at render time, so visibility ≠ access.

### 2. Let Agency-type businesses use Partner Network during trial
`src/lib/pricing.ts`
- Keep the tier table as-is (Scale still lists it for pricing display).
- Add a small override map `MODULE_TIER_OVERRIDES_BY_VERTICAL` so that when `business_type === 'agency'`, `partner_network` is treated as a Growth module.

`src/lib/planGating.ts`
- `useCanAccessModule` fetches the business's `business_type` (single extra field from the existing profile/business query it already reads for trial state) and applies the override before calling `canAccessModule`.
- Non-agency verticals stay on the current Scale-only gating.

### 3. Grant your own workspace Scale for testing (no code)
Since you're a super admin, once step 1 is deployed:
- Open **Super Admin → Businesses**, find your business, pick **Scale** in "Manage Plan", Confirm. That sets `subscriptions.plan='scale'` via the existing `set_business_plan` action — Partner Network unlocks immediately.

### Not in scope
- Backend RLS on `partner_orders` etc. already uses `business_has_scale_access`; the vertical override lives only in the UI gate. If Agency-during-trial writes must also be allowed at the DB level, that's a follow-up migration to extend `business_has_scale_access` to include Agency-on-trial — call out if you want that included.

## Technical notes

```text
Sidebar item        module flag         alwaysShow?   before → after
Partner Network     partner_network     no  → yes     hidden → visible (PlanGate still applies)
Fee Schedule        fee_schedule        no  → yes     hidden → visible (PlanGate still applies)
```

```text
useCanAccessModule('partner_network')
  business_type = 'agency'  && effectivePlan = 'growth'  → allowed
  business_type = 'agency'  && effectivePlan = 'starter' → blocked (Growth)
  business_type != 'agency' && effectivePlan = 'scale'   → allowed
  business_type != 'agency' && effectivePlan = 'growth'  → blocked (Scale)
```

Files touched: `AppLayout.tsx`, `pricing.ts`, `planGating.ts`. No migrations, no schema changes.
