## Goal

The sidebar shows a curated menu **per business type** (vertical). Every item relevant to that vertical is always visible — regardless of what was ticked at onboarding or the current tier. Items that require a higher plan still render normally; clicking them lands on the route and the existing `PlanGate` shows the upgrade CTA. This creates awareness of higher-tier features and a natural upgrade path.

## Root cause today

`src/components/layout/AppLayout.tsx` filters items by `business.modules` (onboarding tick-list). Anything unticked disappears, and whole groups collapse. Vertical fit is not considered at all.

## Vertical → module visibility map (source of truth)

Derived from `BUSINESS_TYPES[].flags` in `src/lib/constants.ts` so it stays consistent with existing capability flags.

Always visible for every vertical (core operating loop):
- `dashboard`, `ideas`, `tasks`, `crm`, `contacts`, `cards` (Card Scanner), `engagement`, `attendance`, `forms`, `reports`, `assistant`, `analytics`, `branches`, `finance`, `compliance`, `settings`, `help`, `support`

Vertical-conditional (shown only when the flag/type matches):
- `inventory` — only if `flags.holds_inventory === true` (Manufacturing, Trading, Retail) or type is `custom`
- `vendors` (Vendors & PO) — same rule as `inventory` (needs stock movement to be meaningful)
- `partner_network` — only if `flags.has_vendor_layer === true` AND `flags.relationship_arity === 'three_party'` (Agency, Real Estate, Finance) or type is `custom`
- `fee_schedule` (Fee Plans) — only if `flags.revenue_model === 'installment'` (Education) or type is `custom`

`custom` type sees everything (no assumptions).

This produces sensible per-vertical menus, e.g.:
- **Services / IT**: no Inventory, no Vendors & PO, no Partner Network, no Fee Plans.
- **Agency**: no Inventory / Vendors & PO, but Partner Network (labelled "Vendors & Commissions") visible.
- **Education**: no Inventory / Vendors / Partner Network, but Fee Plans visible.
- **Manufacturing / Trading / Retail**: Inventory + Vendors visible; Partner Network and Fee Plans hidden.
- **Finance / Real Estate**: Partner Network visible; Inventory / Vendors / Fee Plans hidden.

## Change (UI only)

1. **New helper** in `src/lib/constants.ts`:
   `isModuleRelevantForVertical(module: string, type: BusinessType | null): boolean` — implements the map above using `BUSINESS_TYPES[].flags`. Single source of truth so Onboarding, Settings, and the sidebar all agree.
2. **`src/components/layout/AppLayout.tsx`**:
   - Remove the `modules.includes(...)` filter and the `alwaysAvailable` bypass.
   - Filter each group with `isModuleRelevantForVertical(item.module, business.business_type)`.
   - Keep the group-header hide behaviour if a whole group ends up empty (won't happen for standard verticals, but safe).
   - Keep the existing "Soon" badge (`isComingSoonModule`).
   - Presentation polish: for items not included in the current plan (`canAccessModuleForVertical(plan, module, businessType)` from `src/lib/planGating.ts` / `src/lib/pricing.ts` returns `false`), render a small `Lock` icon at the right of the row. Row stays clickable — `PlanGate` on the route handles the upgrade CTA.
3. **Optional cleanup (same file only)**: use `getPartnerLabels(business.business_type).navLabel` for the Partner Network row label (already wired).

No changes to:
- `PlanGate.tsx`, `pricing.ts` tier lists, RLS, RPCs
- Onboarding flow (module ticks still saved; just no longer drive sidebar)
- Mobile bottom bar (already static)

## Files to edit

- `src/lib/constants.ts` — add `isModuleRelevantForVertical` helper.
- `src/components/layout/AppLayout.tsx` — swap filter, add Lock indicator.

## Verification

- Services / IT business on Growth trial: sidebar hides Inventory / Vendors & PO / Partner Network / Fee Plans; everything else visible; Finance/Analytics show a Lock icon and open PlanGate on click.
- Agency on Growth trial: Partner Network visible (labelled "Vendors & Commissions"), no Inventory / Vendors & PO / Fee Plans; Partner Network opens without upgrade (agency Growth override); Analytics locked.
- Education on Growth trial: Fee Plans visible, no Inventory / Vendors & PO / Partner Network; Fee Plans opens to PlanGate (Scale-only).
- Manufacturing on Growth trial: Inventory + Vendors & PO visible with Lock; Partner Network + Fee Plans hidden.
- Custom on Starter: everything visible; almost everything shows Lock and lands on PlanGate.
- Typecheck clean.

Approve and I'll implement.
