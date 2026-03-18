

# End-to-End App Audit: Errors, Validation & CRO Fixes

After reviewing the full codebase across all pages, hooks, database schema, and RLS policies, here are the issues found grouped by severity.

---

## Critical Bugs

### 1. Settings page — `stages` state initialization causes infinite re-render
In `Settings.tsx` (lines 57-59), the `stages` state is conditionally set inside the render body via `if (business?.pipeline_stages && stages.length === 0)`. This triggers a state update during render, which can cause infinite loops.
**Fix**: Move this to a `useEffect` or initialize `stages` from `business` data using a derived pattern.

### 2. `useLead` uses `.single()` which throws on missing data
In `useSupabaseData.ts` line 389, `useLead(id)` uses `.single()`. If a lead is deleted or the ID is invalid, this throws an error instead of returning `null`.
**Fix**: Change to `.maybeSingle()`.

### 3. `useBusiness` uses `.single()` — same issue
Line 12 in `useSupabaseData.ts`. If the business row doesn't exist (edge case during onboarding race), this throws.
**Fix**: Change to `.maybeSingle()`.

### 4. WhatsApp link injection risk
In `CRM.tsx` line 256 and `LeadDetail.tsx` line 112, phone numbers are passed directly to `wa.me/91${encodeURIComponent(phone)}`. The `91` prefix is hardcoded and doesn't handle numbers that already include country codes, or non-Indian numbers.
**Fix**: Strip non-digits, detect existing country code, then construct the URL.

### 5. Logo upload uses `card-scans` bucket
In `Settings.tsx` line 128, business logos are uploaded to the `card-scans` storage bucket. This is semantically wrong and could cause issues with bucket-level policies.
**Fix**: Create a dedicated `logos` bucket or at minimum rename the path prefix, and validate file size (<2MB) server-side.

---

## Data Validation Issues

### 6. No input validation on forms across the app
- **Signup**: Only checks password length >= 6 client-side. No email format validation beyond HTML `type="email"`.
- **CRM / Tasks / Contacts / Finance**: Name fields only check `trim()` — no max-length limits, no XSS sanitization.
- **Phone fields**: No format validation anywhere. Users can enter any text.
- **Finance amount**: No min/max validation. Negative amounts are possible.
- **Tier settings**: No min (0) or max validation on frequency days.

**Fix**: Add Zod schemas for critical forms (signup, lead creation, transaction entry). Add `maxLength` props to inputs. Validate phone format (digits only, 10-15 chars).

### 7. CSV Import lacks validation
`CSVImport.tsx` trusts CSV data without sanitizing. Fields like `value`, `lifetime_value` use `Number(val) || 0` which silently converts bad data. The `tier` field validates for A/B/C but defaults to `B` silently. No row-level error reporting.
**Fix**: Add per-row validation with error reporting, sanitize string inputs (trim, max length).

### 8. `addToCRM` in Contacts uses hardcoded stage `'New Lead'`
Line 93 in `Contacts.tsx` hardcodes `stage: 'New Lead'` which may not exist in the user's configured pipeline stages.
**Fix**: Use `business?.pipeline_stages?.[0]` as the default stage.

---

## CRO & UX Issues

### 9. No "Forgot Password" flow
The Login page has no password reset link. Users who forget their password are stuck.
**Fix**: Add a "Forgot Password?" link that calls `supabase.auth.resetPasswordForEmail()`.

### 10. No loading/disabled state on delete confirmations
Delete operations in CRM and Tasks show confirm dialogs but the confirm button has no loading spinner or disabled state during the async operation.
**Fix**: Track `isPending` state on delete mutations and pass to confirm buttons.

### 11. Dashboard hardcodes ₹ currency symbol
Line 55 in `Dashboard.tsx` uses `₹` for pipeline value display regardless of the business's configured currency.
**Fix**: Read `business?.currency` and use it for all monetary displays.

### 12. Console warning: Function components cannot be given refs
The Landing page's `Badge` component is receiving a ref from `Link` or similar. This is a harmless warning but indicates improper component composition.
**Fix**: Either wrap `Badge` with `forwardRef` or restructure the JSX.

### 13. Mobile bottom nav doesn't highlight non-root pages
The bottom nav only has 4 items + "More". Pages like Attendance, Engagement, Contacts won't show as active, giving users no visual feedback.
**Fix**: Consider showing the active page label in the header bar, or dynamically swapping bottom nav items based on enabled modules.

### 14. Export menu — transactions export passes `undefined` when no data
In `Finance.tsx` line 94, `exportTransactionsCSV(transactions)` — `transactions` can be `undefined` since `useTransactions` returns `data` which is `undefined` while loading. Should pass `transactions || []`.

---

## Security Concerns

### 15. Role assignment lacks server-side authorization
In `Settings.tsx`, the `updateMemberRole` function deletes and re-inserts roles using the client. The RLS policy for `user_roles` INSERT uses `business_id = get_user_business_id(auth.uid())` — this means **any authenticated member** of the business can assign roles, not just admins/owners. The `isAdmin` check is client-side only.
**Fix**: Create a `SECURITY DEFINER` function that validates the caller has `admin` or `owner` role before allowing role changes.

### 16. `activity_logs.user_id` has no FK constraint
Activity logs reference `user_id` but there's no foreign key. Not a blocker but could lead to orphaned data.

---

## Implementation Plan

### Task 1: Fix critical runtime bugs
- Change `.single()` to `.maybeSingle()` in `useBusiness` and `useLead`
- Fix `stages` infinite re-render in Settings via `useEffect`
- Fix `addToCRM` to use dynamic first pipeline stage

### Task 2: Add input validation
- Add max-length to all Input fields (name: 100, email: 255, phone: 20, notes: 2000)
- Validate phone format (digits, 10-15 chars) before WhatsApp/call actions
- Validate finance amounts (> 0)
- Add proper password strength indicator on signup

### Task 3: Add Forgot Password flow
- Add reset password link on Login page
- Create a simple reset form using `supabase.auth.resetPasswordForEmail()`

### Task 4: Fix currency hardcoding
- Pass `business?.currency` through to Dashboard, Finance, CRM displays
- Replace all hardcoded `₹` with dynamic currency

### Task 5: Fix console warnings & minor UX
- Fix the `forwardRef` warning on Landing page Badge
- Add loading states to delete confirm buttons
- Fix export menu to handle undefined data
- Create a `logos` storage bucket and update Settings upload

### Task 6: Secure role assignment server-side
- Database migration: Create a `assign_role` SECURITY DEFINER function that checks caller has admin/owner role
- Update Settings.tsx to call the RPC instead of direct table manipulation

---

## Technical Details

Files to modify:
- `src/hooks/useSupabaseData.ts` — `.maybeSingle()` fixes
- `src/pages/Settings.tsx` — useEffect for stages, logo bucket, role assignment
- `src/pages/Login.tsx` — forgot password
- `src/pages/Signup.tsx` — validation improvements
- `src/pages/Dashboard.tsx` — dynamic currency
- `src/pages/CRM.tsx` — WhatsApp URL fix
- `src/pages/LeadDetail.tsx` — WhatsApp URL fix
- `src/pages/Contacts.tsx` — dynamic stage for addToCRM
- `src/pages/Finance.tsx` — null-safe export, amount validation
- `src/pages/Landing.tsx` — forwardRef fix
- `src/components/shared/CSVImport.tsx` — validation improvements
- New migration: `assign_role` function + tighten `user_roles` INSERT policy
- New migration: `logos` storage bucket

