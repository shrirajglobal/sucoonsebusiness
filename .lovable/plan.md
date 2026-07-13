
## Goal

Give Super Admin full control over each business's subscription (tier, billing cycle, expiry date, reason note) and mirror the state on the user side in Settings, where users can also request an upgrade that the admin approves from the same panel.

## 1. Database

Single migration:

- Add to `public.subscriptions`:
  - `granted_by` (uuid, nullable) — admin user id who last overrode the plan
  - `grant_reason` (text, nullable)
  - `granted_at` (timestamptz, nullable)
- `upgrade_requests` already exists (used by `SuperAdmin.tsx`). Add a `linked_subscription_id` column for the "approve → grant" flow, if not already present.
- No RLS change: `subscriptions` stays admin-write via edge function; users still read their own row.

## 2. Edge function — `super-admin-action`

Extend the existing `set_business_plan` case:

- New body fields: `new_plan`, `billing_cycle` (`monthly` | `annual`), `duration_days` (int, optional — omit = no expiry), `reason` (string, required when overriding).
- Compute `current_period_end = now() + duration_days` when provided; else `null` (permanent until changed).
- Persist `granted_by`, `grant_reason`, `granted_at`, `activation_source = 'manual_admin'`.
- Keep the existing `activity_logs` audit insert; include the new fields in `metadata`.

New action `approve_upgrade_request`:
- Input: `request_id`, `new_plan`, `billing_cycle`, `duration_days`, `reason`.
- Runs the same plan-grant logic on the request's `business_id`, then marks the `upgrade_requests` row `status = 'approved'` and stamps `resolved_by` / `resolved_at`.
- `reject_upgrade_request`: sets `status = 'rejected'` with optional note.

## 3. Super Admin UI — `src/pages/SuperAdmin.tsx`

Replace the inline dropdown+Confirm in the Businesses tab with a **Manage Plan dialog**:

- Fields: Plan (Starter/Growth/Scale), Billing cycle (Monthly/Annual), Duration (No expiry / 1 mo / 3 mo / 6 mo / 12 mo / Custom date via shadcn date picker), Reason (required, textarea).
- Shows current plan, current `current_period_end`, and last override (granted_by email + reason) fetched from `subscriptions` + a join to admin email.
- Submit → calls `set_business_plan` with the new payload; toast + invalidate.

Upgrade Requests tab:
- Add "Approve & Grant" button that opens the same dialog pre-filled with the requested tier; on submit calls `approve_upgrade_request`.
- Keep existing status update path as "Reject".

## 4. User Settings UI — `src/pages/Settings.tsx`

In the existing Plan & Billing card:

- If `activation_source = 'manual_admin'`, show a badge "Granted by admin" plus the expiry date (or "No expiry") pulled from `current_period_end`. Hide the Razorpay "Switch to …" buttons for that plan (a paid upgrade would overwrite the grant); show "Contact support to change plan" instead, alongside the request button below.
- Add a **"Request higher plan"** section (visible for Starter and Growth users):
  - Button opens a small dialog: target tier (only tiers above current), preferred billing cycle, short business justification.
  - Inserts into `upgrade_requests` (already RLS-permitted for users on their own business).
  - Shows the current pending request state with a "Cancel request" action if `status = 'pending'`.

## 5. Types / hooks

- Regenerate `src/integrations/supabase/types.ts` after migration (automatic).
- Extend `useCurrentPlan` in `src/lib/planGating.ts` to expose `activationSource`, `grantedAt`, `grantReason`, `currentPeriodEnd` so Settings can render the admin-granted state.
- No new hook file — reuse `adminAction` helper for the new edge-function actions.

## Technical notes

- Duration is enforced by writing `current_period_end`; the existing `business_has_growth_access` / `business_has_scale_access` SQL helpers already gate on `current_period_end`/`status`, so expiry works automatically for both RLS and UI gating without extra plumbing.
- Reason is required to keep the audit log meaningful; the edge function rejects a `set_business_plan` call without one.
- No changes to Razorpay flows. Paid activations continue to set `activation_source = 'razorpay'`; admin grants set `manual_admin`. If the user later pays, Razorpay flow overwrites the manual grant — that's intentional.
- All new UI is presentation-only; business logic stays in the edge function.
