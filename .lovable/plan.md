
Issue confirmed: the insert policy fix did apply, but onboarding still fails because the app inserts into `businesses` with `.select().single()`. That makes the backend try to immediately return the inserted row, which is effectively a read. At that moment the user still does not have `profiles.business_id` set, so the current `businesses` SELECT policy blocks access and the API surfaces it as `new row violates row-level security policy for table "businesses"`.

What I would implement
1. Fix the onboarding write flow in `src/pages/Onboarding.tsx`
   - Stop using `.insert(...).select().single()` for `businesses`.
   - Use a plain insert that does not request row representation.
   - Then fetch the new business id in a safe way, or better, move the whole onboarding sequence into one backend call so the business creation, profile link, role creation, team creation, and seed data happen atomically.

2. Preferred robust fix: create a backend RPC/function for onboarding
   - Add a SQL function like `complete_onboarding(...) returns uuid` with `security definer`.
   - Inside it:
     - create business
     - update current user profile with `business_id`
     - insert owner role
     - optionally insert team members
     - optionally seed starter tasks/leads/customers
     - return the new business id
   - This avoids the temporary “no business yet / business just created” state that is breaking RLS.

3. Keep RLS strict
   - Do not loosen `businesses` SELECT to expose arbitrary rows.
   - Keep insert restricted to authenticated users without a business.
   - If needed, adjust `user_roles` / `team_members` onboarding-related permissions only after the RPC design is finalized.

4. Improve failure handling in onboarding UI
   - Show clearer error messages per step.
   - Log which onboarding stage failed so future issues are easier to diagnose.
   - Reset loading state reliably on all failures.

Why this is the right fix
- The current policy is not the real remaining problem.
- The problem is the sequence:
  ```text
  create business -> try to read inserted business -> read blocked by SELECT policy ->
  later profile.business_id would have been updated, but request already failed
  ```
- An atomic backend onboarding function removes this race/ordering problem and is safer than weakening access rules.

Files likely to change
- `src/pages/Onboarding.tsx`
- new migration in `supabase/migrations/` for the onboarding SQL function and any policy adjustments

Technical details
- Current active policy on `businesses`:
  ```text
  INSERT: with_check get_user_business_id(auth.uid()) IS NULL
  SELECT: id = get_user_business_id(auth.uid())
  ```
- Current profile for the affected user has `business_id = null`, which is expected before onboarding completes.
- Network logs show the failing request includes `Prefer: return=representation`, confirming the immediate readback path.

Implementation order
1. Add atomic onboarding SQL function.
2. Update onboarding page to call that function instead of chained client-side inserts.
3. Keep redirect/reload behavior after success.
4. Optionally add better toast messages for partial/validation failures.

Expected result
- “Launch My Business” completes successfully for first-time users.
- No need to weaken business visibility rules.
- Onboarding becomes more reliable for all future users.

<lov-actions>
<lov-suggestion message="Test the onboarding flow end-to-end after the fix by creating a new business and confirming the dashboard loads correctly.">Verify that it works</lov-suggestion>
<lov-suggestion message="Implement the onboarding flow as a single atomic backend function so business creation, profile linking, roles, and demo data happen safely in one step.">Make onboarding atomic</lov-suggestion>
<lov-suggestion message="Add clearer onboarding error handling that shows which step failed, such as business creation, profile linking, role creation, or demo data seeding.">Improve onboarding errors</lov-suggestion>
<lov-suggestion message="Add Phase 4 modules to the onboarding module selection so new businesses can enable finance, inventory, vendors, compliance, assistant, and branches from day one.">Expand module selection</lov-suggestion>
</lov-actions>
