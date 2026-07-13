
# Vendors & Commission — CRO & UX Redesign

## The core CRO problems today

An Indian business owner opens this module to answer one question first: **"How much money is owed to me and by whom?"** The current design buries that answer three tabs deep and puts data-entry chrome on top. Concretely:

1. **Wrong information hierarchy.** Landing tab is "Vendors & Clients" — actually a product-mapping directory. The revenue outcome (commission tracker) is hidden under `Reports → Commission`.
2. **No KPI strip.** No glanceable "₹ receivable / ₹ overdue / this month earned" numbers. Owner has to hunt.
3. **Confusing tab labels.** "Vendors & Clients" doesn't manage vendors or clients (those live in `Vendors.tsx`/`Engagement.tsx`). It maps items to partners. "Bills" mixes bills + commission-rate settings + order logging.
4. **Hard block on first bill.** If no commission rate is set, the "Create bill" button is disabled with a red banner. New user has to detour into a nested "Commission rates" dialog with zero guidance.
5. **"New bill" vs "Log an order"** distinction is opaque — two similar buttons side by side, no explanation of when to use which.
6. **Bill dialog is a wall of 8+ fields** — LR/transport fields shown to Agency/Finance verticals that never use them. Commission preview lives at the bottom (below the fold on mobile).
7. **Commission tracking is passive.** No aging buckets (0-30 / 31-60 / 60+). "Overdue" flag only fires on Receivable status; Pending commissions can sit forever without a nudge.
8. **Reconciliation flow is disconnected.** Marking a bill "Paid" on Bills tab silently moves commission to Receivable — but the user sees no confirmation, no link to it, no "you can now collect ₹X".
9. **No filter/search on bills list.** Once a business has 50 bills it becomes an unusable scroll.
10. **Non-admins see disabled features silently.** Override-commission action is admin-only but no affordance/tooltip explains it.
11. **Vendor picker is context-less.** No hint about outstanding balance, default terms, or last-billed date when choosing a vendor.
12. **Empty states point to the wrong place.** E.g. "Go to bills" from empty Commission tab — but they need to set a rate first.

---

## The redesigned flow (UX only, no schema change)

### A. New landing surface: "Money" dashboard as the default tab

Replace the current three-tab structure

```text
Vendors & Clients | Bills | Reports
```

with an outcome-first structure:

```text
Overview | Bills | Directory | Reports
```

- **Overview** (new default tab) — the CRO win. A single scroll containing:
  - **KPI strip** (4 tiles, mobile-first row that wraps):
    `Commission receivable · Overdue (30+ d) · This month earned · Bills awaiting invoice`
    Each tile is clickable → deep-links into the filtered list.
  - **"Money you can collect now"** section — top 5 receivable commissions, one-tap "Mark received / Write off" inline. Same UI as today's `CommissionTab` receivable section, promoted here.
  - **"Bills awaiting client payment"** — top 5 pending bills, inline `dispatch_status` + `client_payment_status` selects, so reconciliation lives one tap away.
  - **"Orders to invoice"** — logged orders (`order_stage='order_placed'`) with a "Generate invoice" button, so users don't lose track of half-finished work.
  - **Vendor scoreboard mini** — top 3 vendors by commission earned, with a "See all" → Reports > By Vendor.
- **Bills** — same as today but leaner (see section C).
- **Directory** — renamed from "Vendors & Clients" (which never edited either). This is the item↔partner mapping + AI search, unchanged in content.
- **Reports** — same four sub-tabs (Commission, Client Ledger, By Vendor, Bill Register); Commission stays here but is no longer the only place to see receivables.

### B. First-run onboarding of commission rate — remove the hard block

Instead of disabling "Create bill" when no rule exists:

- Show a **one-line inline card** at the top of the Overview + Bills tab when `rules` is empty:
  `"Set a default commission rate so bills auto-calculate what you'll earn. → Set rate now"` (opens the existing dialog).
- Inside the "New bill" dialog, if no rule exists for the selected vendor, keep the amber warning but **also** offer a compact inline field: `"Set commission for {vendor} now: [ % / ₹ ] [value] [Save & continue]"`. Uses the existing `useUpsertCommissionRule`. Zero page navigation.

### C. "New bill" dialog — progressive disclosure + vertical awareness

- **Two-step layout** inside the same dialog (no route change):
  1. **Deal**: Client, Vendor, Item, Amount, Bill date. Live commission preview docked directly under Amount — becomes the visual anchor.
  2. **Details (optional, collapsed)**: Discount, Due date, Payment terms, LR number, Notes.
- **Vertical-aware fields.** LR number + transport-heavy fields render only when `businessType` benefits from them (Trading / Retail / Manufacturing); Agency / Finance / Real Estate get a slimmed form. Uses existing `businessType` already threaded through.
- **Vendor context chip** below the vendor picker: `"Outstanding ₹X · Default terms: 30 days · Last bill 12 d ago"` — computed from `useClientVendorBalances` + vendors data already on the page.
- **Discount displayed as either ₹ or %** with a toggle; store amount as today (no schema change). Cleans up an existing off-by-intuition bug where users type "5" meaning 5% but the field is in rupees.
- **Auto-collapse "Log an order"** into the "New bill" dialog as a secondary action: single primary button `[ Create bill ]` with a dropdown chevron → `Log as order (invoice later)`. One entry point, two outcomes, no dual buttons on the toolbar.

### D. Bills list — filters, aging, and reconciliation clarity

- **Toolbar above the list**: search box (client / vendor / LR / notes), status filter chips (`All · Order · Awaiting payment · Paid`), and a date-range quick filter (`This month · Last 30 d · This quarter`).
- **Row redesign**: aging badge (`Due in 5 d` / `12 d overdue`) computed from `due_date`, colored subtly. The existing `Order — not yet invoiced` badge stays.
- **After a user marks a bill "Paid"**, a toast anchors to Overview: `"₹X commission now receivable → Collect"` with a click-through. Reconnects the two flows.
- **Inline edit** for admin/manager on amount/discount/due-date via a small pencil affordance — reuses `useUpdatePartnerOrder`; the `commission_amount` override path (admin-only) stays gated as today with a tooltip explaining why non-admins can't touch it.

### E. Commission tab — aging + urgency

- Add an **aging summary bar** at top of the Commission tab: `0-30 d · 31-60 d · 60+ d` with counts and totals for both Pending and Receivable statuses. Uses `created_at` for pending, `receivable_since` for receivable.
- Extend the overdue rule to fire on Pending too (bills paid by client but commission stuck): >45 days on `created_at`.
- Add a `Export receivables` action into the existing `ExportMenu` pattern for follow-up outside the app (WhatsApp/email nudges).

### F. Empty-state and micro-copy cleanup

- Every "Go to bills" empty-state CTA becomes plan-aware: if no rule exists, CTA goes to "Set commission rate"; else "Create your first bill".
- "Vendors & Clients" → renamed **"Directory"** in the tab bar; page subtitle explains it's a lookup of items you resell.
- Commission rates dialog title clarified: `"Commission rates you earn"` (owner-facing, not "rate configuration").

### G. Non-admin discoverability

- Any admin-only action (`Adjust commission amount`) renders as a disabled ghost button with a tooltip `"Ask an admin to adjust commission"` for non-admins — currently the button is hidden entirely, so team members don't know the capability exists at all.

---

## Files touched (presentation only)

- `src/pages/Partners.tsx` — restructure tabs (Overview / Bills / Directory / Reports), extract `OverviewTab` component, refactor `BillsTab` (dialog split, toolbar, aging), add aging bar to `CommissionTab`, tooltips + inline rate-set for non-admin/no-rule cases.
- `src/hooks/usePartnerNetwork.ts` — no changes required; existing queries expose everything the new views need.
- `src/lib/exportUtils.ts` — add `exportReceivablesCSV` alongside the existing bills exporters.
- `src/components/shared/CreatableSearchSelect.tsx` — expose an optional `renderFooter` prop so the vendor picker can show the context chip inline (no logic change; strictly presentational slot).

Nothing in this plan changes SQL, RLS, RPCs, or the commission math — Phase 7 stays intact.

---

## Verify before shipping

- Owner (Agency) opens `/partners` → immediately sees receivable / overdue / month-earned numbers without switching tabs.
- New user with zero data can create their first bill without hitting a hard block; the inline "set rate" widget saves and the same dialog continues.
- LR/transport fields disappear for Agency / Finance / Real Estate businesses in the bill dialog; still present for Trading / Retail / Manufacturing.
- Marking a bill "Paid" surfaces a clickable toast that lands on the newly-created receivable in Overview.
- Non-admin sees a disabled "Adjust commission" affordance with an explanatory tooltip.
- Search + status chips on Bills correctly filter a 50+ bill list at 375 px and 1440 px.
- Aging bar in Commission tab totals match line-item totals exactly.
- `tsgo` clean, no runtime errors.

Stopping here for review.
