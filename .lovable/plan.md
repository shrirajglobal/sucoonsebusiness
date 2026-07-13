## Scope

Extend the existing Partner Network (Agency + Real Estate + Finance) with three additive changes:
1. New master fields on vendors/customers/products.
2. Optional "Log an Order" step that can later be turned into an invoice (the current direct-bill flow stays untouched).
3. Opening Balance on vendors/clients, reflected in the Ledger.

No forking per vertical. No changes to `getPartnerLabels`. All three verticals share exactly the same schema, RPCs, and UI — only the labels differ.

---

## 1. Migration (single file, additive, nullable)

`vendors`:
- `default_payment_terms text`
- `default_discount_percent numeric` (0–100, CHECK)
- `opening_balance numeric NOT NULL DEFAULT 0`

`customers`:
- `reference text`
- `contact_person text`
- `opening_balance numeric NOT NULL DEFAULT 0`

`products`:
- `item_type text NOT NULL DEFAULT 'product' CHECK (item_type IN ('product','service'))`

`partner_orders`:
- `order_stage text NOT NULL DEFAULT 'invoiced' CHECK (order_stage IN ('order_placed','invoiced'))`
- Backfill: every existing row is already invoiced (default handles new inserts; existing rows get 'invoiced' via `UPDATE ... WHERE order_stage IS NULL` — safe since column is new).

RLS: no policy changes needed (columns inherit table policies).

---

## 2. Shared commission helper + new RPCs

Extract the commission math currently inline in `create_partner_order_with_commission` into:

```
public.calculate_commission_for_rule(_business_id uuid, _vendor_id uuid, _net_amount numeric) RETURNS numeric
```
- Looks up vendor-specific rule, falls back to business default, raises if neither exists.
- Handles `percentage` and `flat` (same math as today).
- `SECURITY DEFINER`, `search_path = public`, `GRANT EXECUTE TO authenticated`.

Rewrite `create_partner_order_with_commission` to:
- Keep its exact current signature and behavior.
- Call `calculate_commission_for_rule` instead of inlining the math.
- Insert `partner_orders` row with `order_stage = 'invoiced'` (unchanged fast path).

New RPC:
```
public.create_partner_order_placed(_client_id, _vendor_id, _vendor_product_id, _amount, _order_date, _notes) RETURNS uuid
```
- Checks `business_has_scale_access`.
- Inserts `partner_orders` with `order_stage = 'order_placed'`, no invoice fields, no `commission_transactions` row yet.

New RPC:
```
public.generate_invoice_for_order(_order_id, _lr_number, _due_date, _payment_terms, _discount_amount, _final_amount) RETURNS uuid
```
- Loads order row FOR UPDATE.
- Verifies caller's business matches order's `business_id` and `business_has_scale_access`.
- Fails with clear message if `order_stage = 'invoiced'` (prevents double invoicing).
- Updates the order: `amount = _final_amount`, `lr_number`, `due_date`, `payment_terms`, `discount_amount`, `order_stage = 'invoiced'`.
- Calls `calculate_commission_for_rule(business_id, vendor_id, _final_amount - _discount_amount)` and inserts the `commission_transactions` row.
- Returns the order id.

---

## 3. `client_vendor_balances` view

Recreate with `opening_balance` folded into totals:

```
total_order_value = COALESCE(client.opening_balance,0) + COALESCE(vendor.opening_balance,0) + SUM(po.amount where invoiced)
```

Concretely: aggregate invoiced orders only (`order_stage = 'invoiced'`), then LEFT JOIN customer + vendor opening_balances so ledger reflects true historical dues. Grants: unchanged.

---

## 4. Frontend — `src/pages/Partners.tsx` (all verticals)

Bills tab layout gets a second quick-action next to "New Bill":
- **New Bill** — opens today's form, unchanged.
- **Log an Order** — opens a slim variant: Client, Vendor, Product (all `CreatableSearchSelect`), Expected Amount, Order Date, Notes. Calls `create_partner_order_placed`.

Bills list rows:
- Rows with `order_stage = 'order_placed'` render a "Generate Invoice" button → opens the existing Bill form pre-filled with the order's client/vendor/product/amount/date, and on submit calls `generate_invoice_for_order` instead of `create_partner_order_with_commission`. Rows already invoiced look and behave exactly as today.

Bill form improvements (applies to New Bill and Generate Invoice):
- When vendor changes: pre-fill `payment_terms` from `default_payment_terms`; pre-fill `discount_amount` from `default_discount_percent × amount / 100` (only when amount already set, otherwise recompute on amount change if user hasn't manually edited discount). Fields stay fully editable.
- When selected product's `item_type = 'service'`: hide any quantity/unit UI (project currently has none; guard the future addition — presently a no-op but we'll add the condition around the placeholder block so it's ready).

Vendor / Client full forms:
- Add fields: `default_payment_terms`, `default_discount_percent` (vendors); `reference`, `contact_person` (customers); `opening_balance` on both, labeled "Amount already owed before using Disha."

Inline creation via `CreatableSearchSelect`:
- Extend `CreatableSearchSelect` with an optional `renderExtraOnCreate` slot (or an `onRequestDetails` callback). Chosen approach: after `onCreate` returns the new row, if the parent supplies an `afterCreate(id) => Promise<void>` handler, `CreatableSearchSelect` opens a compact secondary dialog owned by the parent (Vendor / Client). Parent uses a tiny modal with just Opening Balance + optional Payment Terms/Reference and PATCHes the newly created row. Keeps the reusable component generic; opening-balance capture lives in Partners.tsx.

Products creatable: item_type toggle (Product/Service) added to the same secondary dialog when a product is created inline.

---

## 5. Hooks (`src/hooks/usePartnerNetwork.ts`)

- Extend `useCreatePartnerOrder` args (optional): none — direct-bill unchanged.
- Add `useLogPartnerOrder` → wraps `create_partner_order_placed`.
- Add `useGenerateInvoiceForOrder` → wraps `generate_invoice_for_order`.
- Invalidate `partner_orders`, `commission_transactions`, `client_vendor_balances` in both.
- Extend vendor/customer/product mutation hooks to pass the new fields.

---

## 6. Types

Regenerate `src/integrations/supabase/types.ts` post-migration (auto).

---

## Verification checklist (run at end)

- Direct "New Bill" flow: create bill → `order_stage='invoiced'`, commission row present, appears in Bills list identical to today. No behavioural change.
- "Log an Order": row appears with `order_stage='order_placed'`, no commission row, "Generate Invoice" button visible.
- "Generate Invoice": opens Bill form prefilled → submit → order becomes `invoiced`, commission row created, "Generate Invoice" button disappears, calling it again returns the "already invoiced" error.
- Commission math: `create_partner_order_with_commission` and `generate_invoice_for_order` produce identical amounts for same inputs (both call `calculate_commission_for_rule`).
- Ledger: creating a client with opening_balance=5000 immediately shows 5000 in `client_vendor_balances.total_order_value` for that client.
- Vertical parity: switch business_type between agency, real_estate, finance — same fields, same flow, only labels differ.
- Bill form: selecting vendor with `default_payment_terms='net_30'` and `default_discount_percent=5` pre-fills those, still editable.
- Item type: creating a product with `item_type='service'` hides quantity UI on future bill forms (no-op today, guarded).
- `tsgo` clean.

---

## Files touched

- `supabase/migrations/<new>.sql` — schema + view + helper fn + new RPCs + rewrite of existing RPC.
- `src/hooks/usePartnerNetwork.ts` — new mutation hooks, extended field lists.
- `src/pages/Partners.tsx` — "Log an Order" action, "Generate Invoice" affordance, vendor/client/product form field additions, vendor-driven pre-fill, item_type gate.
- `src/components/shared/CreatableSearchSelect.tsx` — optional `onAfterCreate(id)` callback prop (component stays generic, no vertical logic).
- `src/integrations/supabase/types.ts` — regenerated.

Stops here for review before implementation.
