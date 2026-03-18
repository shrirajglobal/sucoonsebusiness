

## Fix: Remove JSON.stringify from RPC parameters

**Root cause**: The Supabase JS client automatically serializes objects to JSON when sending to `jsonb` parameters. By calling `JSON.stringify()` first, the value gets double-encoded — PostgreSQL sees a JSON string `"[{...}]"` instead of a JSON array `[{...}]`, causing `jsonb_array_elements()` to fail with "cannot extract elements from a scalar".

**Fix in `src/pages/Onboarding.tsx`** (lines 70-85):
- Change `_members: JSON.stringify(members)` to `_members: members`
- Change `_seed_tasks: JSON.stringify([...])` to `_seed_tasks: [...]`
- Change `_seed_leads: JSON.stringify([...])` to `_seed_leads: [...]`
- Change `_seed_customers: JSON.stringify([...])` to `_seed_customers: [...]`

Remove the `JSON.stringify()` wrapper from all four parameters while keeping the array contents identical. No other files need to change.

