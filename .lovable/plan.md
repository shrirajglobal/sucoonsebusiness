
# Menu Redesign — Tally-Inspired, Outcome-First Navigation

## Why this matters
Today's sidebar groups items by internal jargon (Core / Business / Advanced / System). An Indian SMB owner opening Disha thinks in **jobs-to-be-done**: "log a sale", "chase a payment", "see my team", "close the books". Tally's genius is that its Gateway is organized by *what you want to do*, not by which module owns the screen. We'll mirror that mental model, and use the newly-locked items as *upgrade billboards* rather than hiding them.

## Design principles (Tally + CRO)
1. **Verb-led grouping** — headings describe outcomes ("Sell & Collect"), not features.
2. **Frequency-first ordering** — daily actions on top, monthly/setup at the bottom (mirrors Tally's Gateway → Vouchers → Reports → Masters flow).
3. **One idea per group** — never more than 4–6 items per section so the eye scans in <1 second.
4. **Locks as billboards** — locked items keep their icon + label, add a subtle amber lock + tier chip ("Growth", "Scale"). Clicking still routes to PlanGate, which is our best converting surface.
5. **Vertical-aware labels** — Agency sees "Vendors & Commissions", Education sees "Fees & Collections", etc. (already partially wired via `PARTNER_LABELS`).
6. **Progressive disclosure** — a "More" collapsible for rarely-used items (Branches, Forms) keeps the primary rail short.

## Proposed structure

```text
DAILY                      ← the "Gateway" — always visible, no locks
  Dashboard
  Idea Board
  Tasks
  My Day (if enabled)

SELL & COLLECT             ← revenue-generating actions
  CRM / Leads
  Contacts
  Card Scanner
  Fee Plans        [vertical-only: education/finance]
  Compliance       [vertical-only: has GST/renewals]

OPERATE                    ← running the business
  Inventory        [vertical-only: holds_inventory]
  Vendors & PO     [vertical-only: holds_inventory]
  Partners / Commissions   [vertical-only: three_party]
  Finance
  Attendance
  Forms

GROW                       ← intelligence & scale (mostly paid tiers)
  Analytics        🔒 Growth
  AI Reports       🔒 Growth
  AI Assistant     🔒 Growth
  Engagement       🔒 Growth
  Branches         🔒 Scale

WORKSPACE                  ← low-frequency, bottom of rail
  Settings
  Help
  Support
```

## Visual & interaction changes
- **Group headers**: uppercase 11px, muted-foreground, 8px letter-spacing — matches Tally's segmented Gateway feel, feels "professional accounting software" not "SaaS toy".
- **Locked rows**: icon at 60% opacity + tiny amber `Lock` on the right + a `Growth`/`Scale` pill on hover. Row stays clickable.
- **Active rail indicator**: 2px left border in `--primary` (forest green), no full-row fill — cleaner scanning.
- **Group collapse**: each group is a `<details>`-style accordion, remembers state in `localStorage`. Daily is always open by default.
- **Mobile bottom nav**: unchanged (Home / Tasks / Ideas / CRM / More) — this redesign only touches the desktop sidebar and the mobile "More" drawer, which will inherit the same 5 groups.

## CRO instrumentation
- Fire `nav_locked_click` event to `activity_logs` with `{module, current_plan, target_tier}` so we can see which locked entries drive the most upgrade dialog opens.
- On the `Grow` group, when *all* items are locked, show a single inline banner: *"Unlock AI + Analytics — from ₹999/mo"* → opens `UpgradeRequestDialog`.

## Vertical relevance (unchanged rules, restated)
- Items governed by `isModuleRelevantForVertical` continue to hide entirely for verticals where they make no sense (e.g. Fee Plans is invisible for Retail, not just locked).
- Items *within a vertical's scope* but above the current tier show the lock — this is the CRO surface.

## Files to change
- `src/components/layout/AppLayout.tsx` — replace `buildNavGroups` with the new 5-group structure, add locked-row visual, group-collapse state, group-level upsell banner.
- `src/lib/constants.ts` — add a `NAV_GROUP` label map keyed by vertical so "Sell & Collect" can become "Admissions & Fees" for education, "Deals & Clients" for agency.
- `src/lib/planGating.ts` — expose `getTierForModule(module, businessType)` so the sidebar can render the correct pill without duplicating logic.
- New tiny component `src/components/layout/NavRow.tsx` — encapsulates icon + label + lock/pill + active indicator, keeps `AppLayout.tsx` readable.

## Out of scope
- No routing changes, no PlanGate changes, no new modules, no DB work.
- Mobile bottom-nav 5 tabs stay as-is.

## Verification
- Playwright at 1440px: Starter/Growth/Scale on Agency, Services, Retail, Education — confirm grouping, lock badges, and vertical hiding.
- Playwright at 375px: confirm "More" drawer renders same 5 groups.
