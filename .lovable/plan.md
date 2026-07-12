# Fix Team Member Invite & Access

## Root cause

Today, "Add Member" in Settings only inserts a row into `public.team_members`. It does **not** create an auth user and does **not** send any email. So `devchandak26@gmail.com` has no login. The password-reset link he tried is also silently no-op — Supabase's `resetPasswordForEmail` returns success even if the email has no account (to prevent enumeration), so nothing arrives.

Even if that member signed up on his own via `/signup`, the app would route him to `/onboarding` and create a **new** business, not join the owner's business, because nothing links `profiles.business_id` to the inviting business.

## Fix — real invite + auto-link

### 1. Owner/admin sends invite (edge function)

New edge function `invite-team-member` (JWT-validated in code, service-role client):
- Validates caller is `owner` or `admin` of the target `business_id` via `user_roles`.
- Upserts the `team_members` row (name / email / phone / department / salary / designation / desired role) and returns the row id. Email is required for invites.
- Calls `supabase.auth.admin.inviteUserByEmail(email, { redirectTo: `${SITE_URL}/login`, data: { invited_business_id, invited_role } })`. Supabase sends the standard invite email using the default Lovable auth sender — no custom domain required. If the auth user already exists, function returns a "user already exists — ask them to reset password" state instead of erroring.
- Idempotent: if `team_members.user_id` is already linked, no-op with clear message.

Also expose a **"Resend invite"** action for any member row where `user_id IS NULL`, which just re-invokes the same function.

### 2. Auto-link on signup (DB trigger)

Extend `public.handle_new_user()` (SECURITY DEFINER, already fires on `auth.users` insert). After creating the profile row, if a `team_members` row exists for the new user's email with `user_id IS NULL`:
- Set `profiles.business_id` to that row's `business_id`, and copy `phone` / `full_name` from the invite if profile fields are empty.
- Update `team_members.user_id` to the new auth user id.
- Insert into `user_roles` with role `executive` (default; owner/admin can change later via existing `assign_role` RPC).

Effect: as soon as the invited user completes signup (which the invite email lands them in), the app skips `/onboarding` because `businessId` is populated, and they land in the owner's workspace with the correct role.

### 3. Settings.tsx UI changes

- Add Member form: email becomes **required** (with inline validation).
- Primary button label changes from "Add Member" to "Send Invite". On success show a toast: *"Invite sent to <email>"*.
- Each member card gets a small **"Pending invite — Resend"** chip + button when `user_id IS NULL`, and shows "Active" once linked.
- No change to the role-change / edit / delete controls.

### 4. Note about the reset-password flow (unchanged behavior, one clarification)

The existing `/login` "Forgot password" flow is correct for **existing** auth users. Because Supabase intentionally returns success even for unknown emails, we'll surface a helper line on the login screen: *"Not received? Ask your admin to resend the invite from Settings → Team."* No functional change required.

## Files touched

- `supabase/migrations/<new>.sql` — replace `public.handle_new_user()` with the auto-link version.
- `supabase/functions/invite-team-member/index.ts` — new edge function (JWT check + admin invite + upsert).
- `supabase/config.toml` — register the new function.
- `src/hooks/useSupabaseData.ts` — replace `useCreateTeamMember` with an `useInviteTeamMember` mutation calling the edge function; add `useResendInvite`.
- `src/pages/Settings.tsx` — email-required form, "Send Invite" / "Resend" wiring, pending-invite chip.
- `src/pages/Login.tsx` — one-line helper text under "Forgot password?".

## Verification

- Owner adds `devchandak26@gmail.com` → row appears with "Pending invite" chip, edge-function log shows `inviteUserByEmail` success, invite email arrives from the default Lovable auth sender.
- New user clicks link → sets password → lands on `/` inside the owner's business, not `/onboarding`. `team_members.user_id`, `profiles.business_id`, `user_roles` all populated for that user.
- "Resend invite" works for pending rows; is disabled for linked members.
- Existing already-linked members are unaffected. RLS on all touched tables unchanged.
- Non-admin caller of the edge function gets 403.
