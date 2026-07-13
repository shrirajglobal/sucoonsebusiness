
# Vertical Relevance — Make the Sidebar Truly Agency-Aware

## Diagnosis

Confirmed against the DB: `shrirajglobal@gmail.com` → `business_type = 'agency'`. Agency flags are:

```
holds_inventory: false
has_vendor_layer: true
revenue_model:    commission
relationship_arity: three_party
```

So for this account the correct sidebar is exactly:
- **Visible**: CRM, Contacts, Card Scanner, Compliance, Partner Network (Vendors & Commissions), Finance, Attendance, Forms, Analytics, AI Reports, AI Assistant, Engagement, Branches, Settings, Help, Support.
- **Hidden entirely (not just locked)**: Inventory, Vendors & PO (these are the "holds_inventory" siblings — agencies don't hold stock), Fee Plans (that's for `installment` verticals — education/finance loans).

Two root causes for what the user is seeing:

1. **Onboarding module picker is not vertical-strict.** `getFilteredAdvancedModules()` (in `src/lib/constants.ts`) only strips Inventory + Vendors when `holds_inventory` is false. It still lists **Partner Network** and **Fee Plans** for every vertical, so an agency owner could pick "Fee Plans" during onboarding, and once it lands in `business.enabled_modules` we later surface it. The sidebar itself filters via `isModuleRelevantForVertical`, so today's sidebar *shouldn't* show Fee Plans/Inventory for agency — but if `businessType` briefly returns `null` while the `useBusiness` query loads, our permissive fallback (`if (!type) return true`) shows every module for that one paint. That flicker is enough to make items appear on first render.

2. **Partner Network has no visible purpose statement.** The label is generic and doesn't explain *why* it exists for an agency. For a Tally user, every menu item earns its place by telling you what job it does. "Partner Network" reads like jargon.

## The Tally-designer answer

Tally never shows a voucher type that doesn't apply to the company you configured. If you set the company to "Services", Stock Vouchers vanish. Not greyed out — gone. The picker at company creation and the runtime Gateway agree, always. We match that discipline.

Two rules, applied everywhere:

- **Rule A — Structural relevance is absolute.** If a module is not relevant to the vertical, it is *not shown anywhere*: not in the sidebar, not in the Onboarding picker, not in the Settings module toggles, not as a locked billboard. Locks are only for *relevant but paid* items.
- **Rule B — Every module states its purpose in one line.** Sidebar hover tooltip + Onboarding subtitle + Settings module row all pull from the same source of truth.

## Changes

### 1. Fix the null fallback (root cause of the flicker)
`isModuleRelevantForVertical(module, type)` in `src/lib/constants.ts`:
- Keep `custom` → returns true.
- Change `null/undefined` → returns `false` for the vertical-specific modules (`inventory`, `vendors`, `partner_network`, `fee_schedule`) and `true` for the generic ones. Prevents the pre-load flash.

### 2. Make Onboarding / Settings module pickers vertical-strict
Rewrite `getFilteredAdvancedModules(type)` to filter every entry through `isModuleRelevantForVertical`. Result for agency: Finance, Compliance, AI Assistant, Branches, **Partner Network** — no Inventory, no Vendors & PO, no Fee Plans, ever. Onboarding.tsx and Settings module toggles inherit this automatically.

### 3. Give every module a one-line purpose
Add `MODULE_PURPOSE` map keyed by module id, with vertical-aware overrides for the polymorphic ones:

```
partner_network (agency)     → "Track vendors, their products, and auto-calculate commission on every deal."
partner_network (real_estate)→ "Track builders/sellers and commissions on closed deals."
partner_network (finance)    → "Track banks/NBFCs and payout on disbursed loans."
fee_schedule (education)     → "Create installment plans and see who owes what this month."
inventory                    → "Stock levels, low-stock alerts, and margin per SKU."
compliance                   → "Never miss GST, TDS, licence renewals, or filings."
engagement                   → "Spot dormant clients before they churn."
...
```

Surface it in three places:
- **Sidebar** — `title` attribute on each nav row for a native hover tooltip (keeps the row compact).
- **Onboarding picker** — second line under each module card, same font weight system as Tally's `F11 Features` descriptions.
- **Partners page hero** — replace the current empty-state single line with the vertical-specific purpose sentence + a "How commissions work" 3-step mini-diagram (Deal → Vendor product → Commission credited).

### 4. Clean-up
- Remove Fee Plans from any agency business's `enabled_modules` in the DB via a small idempotent migration so historical rows stop leaking through. (Only touches rows where the module is structurally irrelevant for that vertical — safe.)
- Update `Onboarding.tsx` seed logic so agency defaults do not include `fee_schedule` or `inventory` even if a legacy DEFAULT_MODULES list contains them.

### 5. Verify
Playwright at 1440px signed in as `shrirajglobal@gmail.com`:
- Sidebar shows CRM, Contacts, Card Scanner, Compliance, **Vendors & Commissions**, Finance, Attendance, Forms, Analytics, AI Reports, AI Assistant, Engagement, Branches, Settings, Help, Support — and nothing else.
- Hover on "Vendors & Commissions" shows the one-line purpose.
- Navigate to `/fee-plans` directly (typed URL) → 404-like PlanGate that says "Not part of Agency workflows" instead of an upsell.

## Files touched
- `src/lib/constants.ts` — strict null handling, rewritten `getFilteredAdvancedModules`, new `MODULE_PURPOSE` map + `getModulePurpose(module, type)` helper.
- `src/components/layout/AppLayout.tsx` — add `title={getModulePurpose(...)}` on each row; small copy tweak on the group upsell.
- `src/pages/Onboarding.tsx` — render purpose subtitle; sanitise default modules.
- `src/pages/Partners.tsx` — new empty-state hero with the 3-step "how commissions work" flow.
- `src/components/PlanGate.tsx` — when a route's module is *not relevant* for the vertical, render a "Not part of your workflow" state instead of an upgrade CTA. Guards against typed URLs.
- One-shot migration: strip structurally-irrelevant module ids from `businesses.enabled_modules`.

## Out of scope
Pricing, tier logic, and the group headers we just shipped. This plan only tightens visibility and adds purpose copy.
