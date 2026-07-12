# Phase 1 — Extend Vendor & Client Master Data

Additive only. No changes to `vendor_products`, `partner_orders`, or products.

## 1. Database migration

Single migration, run in this order:

1. Data cleanup (pre-constraint) on `public.vendors`:
   ```sql
   UPDATE public.vendors
      SET gst_number = NULL
    WHERE gst_number IS NOT NULL
      AND gst_number !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$';
   ```
   Report the affected row count in the migration description so it appears in the changelog.

2. Add columns:
   - `public.vendors`: `pin_code text`, `transport_name text`, `transport_gstin text`, `transport_contact text`
   - `public.customers`: `gst_number text`, `address text`, `pin_code text`, `transport_name text`, `transport_gstin text`, `transport_contact text`

3. Add GSTIN CHECK constraints (NULL always passes):
   - `vendors_gst_number_format_check` on `vendors.gst_number`
   - `customers_gst_number_format_check` on `customers.gst_number`
   
   Regex: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`

No RLS/grant changes — existing policies on `vendors` and `customers` already cover these columns.

## 2. Frontend

### `src/pages/Vendors.tsx` — vendor form
Add to the "New Vendor" dialog, inside a collapsed `<details>` "More details" section below the current fields:
- PIN Code
- Transport Name
- Transport GSTIN
- Transport Contact

All optional text inputs. Extend `EMPTY_VENDOR` and the insert payload.

### `src/pages/Engagement.tsx` — Add Customer dialog
Extend the existing "Add Customer" dialog with the same "More details" collapsed group:
- GSTIN
- Address (textarea)
- PIN Code
- Transport Name
- Transport GSTIN
- Transport Contact

Also expose GSTIN + address in the `CustomerDetail` sheet (read-only display; edit stays out of scope this phase since existing sheet only edits retainer fields).

### `src/pages/Partners.tsx`
No client-add form here (clients are picked from a `Select`), so nothing to change. Vendor list uses `useVendors` but has no creation form here either — vendors are only created in `Vendors.tsx`.

### GSTIN error handling
On save (`vendors.tsx` insert, `Engagement.tsx` customer insert), if the Supabase error message includes `gst_number_format_check` or Postgres error code `23514` on the gst constraint, show inline toast/message:
> "GSTIN format looks incorrect — check and try again"
Otherwise fall back to the current generic error toast.

## 3. Verification

- Create a vendor with only `name` → succeeds.
- Create a customer with only `name` → succeeds.
- Enter GSTIN `29ABCDE1234F1Z5` → saves.
- Enter GSTIN `invalid` → inline "GSTIN format looks incorrect" message; no raw DB error.
- Existing vendors/customers load and display normally.

## Technical notes

- Types file (`src/integrations/supabase/types.ts`) regenerates automatically after the migration is approved, exposing the new columns.
- Form reorganization (tabs/relabel) is deliberately deferred to Phase 5.
