

## Plan: Critical Security Hardening for Go-Live

This plan addresses all critical and high-severity findings from the security audit, organized by priority.

---

### Phase 1: Lock Down Data Exposure (Critical)

**1a. Affiliate RLS policies** — Replace `USING (true)` with scoped policies.

Migration SQL:
- Drop existing permissive SELECT/INSERT policies on `affiliates` and `affiliate_events`
- `affiliates` SELECT: allow authenticated users to read only their own row (`email = auth.jwt()->>'email'`), plus a security-definer function `get_affiliate_by_code(code)` for public code lookups (returns only `id, affiliate_code, status` — no PII)
- `affiliate_events` SELECT: only rows where `affiliate_id` belongs to the current user's affiliate record
- `affiliate_events` INSERT: restrict to service role only (edge function handles inserts)

**1b. Storage buckets** — Make `card-scans`, `voice-notes`, and `logos` private.

Migration SQL:
- Update buckets to `public = false`
- Add RLS policies on `storage.objects`:
  - `card-scans`: authenticated users can read/write files in their business path (`business_id/...`)
  - `voice-notes`: same business-scoped access
  - `logos`: same business-scoped access

**Files**: 1 migration, storage bucket config updates

---

### Phase 2: Harden Edge Functions (Critical)

**2a. Add JWT auth to `voice-transcribe` and `ai-report`**

Both functions will validate the Authorization header using `createClient` + `getUser()` before processing. Reject with 401 if no valid user.

Add a file-size limit (5MB) on voice-transcribe to prevent abuse.

**2b. Fix `affiliate-track` logic bug and add validation**

- Remove the buggy line 91 (`total_signups: affiliate.id` — sets UUID as integer)
- Keep only the `increment_affiliate_signups` RPC call
- Add input validation (affiliate_code format, business_id UUID format)
- This function stays unauthenticated (it's a public tracking endpoint) but add rate-limit headers and validate inputs strictly

**Files**: `voice-transcribe/index.ts`, `ai-report/index.ts`, `affiliate-track/index.ts`

---

### Phase 3: Rebuild Affiliate Auth (Critical)

**AffiliateDashboard.tsx** — Replace email-only lookup with proper Supabase Auth.

- Remove the email input "login" flow
- Require actual authentication (redirect to `/login` if not authenticated)
- After auth, look up affiliate record matching `auth.jwt()->>'email'`
- This way only the authenticated owner can see their own affiliate data

**Files**: `src/pages/AffiliateDashboard.tsx`

---

### Phase 4: Harden Super-Admin Model (High)

- Keep the hardcoded email as a fallback but add a `user_roles` check: if user has role `owner` in the system, they get super-admin access
- The edge functions (`super-admin-data`, `super-admin-action`) already validate JWT + email — enhance to also check a DB role
- Add the super-admin email to a config constant used in edge functions (already done) — this is acceptable for a single-tenant pre-launch app

**Scope limitation**: Full role-based super-admin with audit logging is a Week 2 item. For go-live, the current model with JWT validation is acceptable since the edge functions already verify the token.

**Files**: No changes for go-live (already JWT-validated in edge functions). Document as tech debt.

---

### Phase 5: Config & Hygiene (High)

**5a. `.gitignore`** — Add `.env` to gitignore.

Note: The `.env` file is auto-managed by Lovable Cloud, so this is informational. Add it to prevent accidental commits in external workflows.

**5b. README** — Update with project description, setup instructions, and architecture overview.

**Files**: `.gitignore`, `README.md`

---

### Phase 6: Architecture Cleanup (Noted, Week 2)

These are documented but NOT implemented in this plan:
- Split `useSupabaseData.ts` into per-module hooks
- Centralize authorization wrappers
- Add CI pipeline, E2E tests, observability
- Server-side trial enforcement

---

### Technical Details

**Database migration** (single migration file):
```sql
-- 1. Restrict affiliate policies
DROP POLICY IF EXISTS "Anyone can apply as affiliate" ON public.affiliates;
DROP POLICY IF EXISTS "Anyone can read affiliates by code" ON public.affiliates;

CREATE POLICY "Affiliates can view own record" ON public.affiliates
  FOR SELECT TO authenticated USING (email = (auth.jwt()->>'email'));

CREATE POLICY "Anyone can apply as affiliate" ON public.affiliates
  FOR INSERT TO public WITH CHECK (true);

-- Security definer for public code lookups (no PII exposed)
CREATE OR REPLACE FUNCTION public.get_affiliate_by_code(_code text)
RETURNS TABLE(id uuid, affiliate_code text, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, affiliate_code, status FROM public.affiliates WHERE affiliate_code = _code;
$$;

-- 2. Restrict affiliate_events
DROP POLICY IF EXISTS "Anyone can read affiliate events" ON public.affiliate_events;
DROP POLICY IF EXISTS "System can insert affiliate events" ON public.affiliate_events;

CREATE POLICY "Affiliates can view own events" ON public.affiliate_events
  FOR SELECT TO authenticated
  USING (affiliate_id IN (
    SELECT id FROM public.affiliates WHERE email = (auth.jwt()->>'email')
  ));

-- Service role handles inserts via edge function, no public insert needed
CREATE POLICY "Service role inserts events" ON public.affiliate_events
  FOR INSERT TO service_role WITH CHECK (true);

-- 3. Make storage buckets private
UPDATE storage.buckets SET public = false WHERE name IN ('card-scans', 'voice-notes');
```

**Edge function changes**:
- `voice-transcribe/index.ts`: Add ~10 lines of JWT validation at top
- `ai-report/index.ts`: Add ~10 lines of JWT validation at top
- `affiliate-track/index.ts`: Remove line 91 (buggy UUID write), add input validation

**Frontend changes**:
- `AffiliateDashboard.tsx`: Replace email lookup with `useAuth()` hook, redirect unauthenticated users
- `.gitignore`: Add `.env` line
- `README.md`: Add project documentation

**Files modified**: 1 migration, 4 edge functions, 2 frontend files, 2 config files

