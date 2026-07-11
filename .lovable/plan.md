## Goal
The onboarding "Business Type" step should show all 9 verticals defined in `BUSINESS_TYPES` (including **Agency / Broker**) under their group headers. The screenshot shows only 8 tiles and no group headers — Agency is missing.

## Findings
- `src/lib/constants.ts` already declares `agency` in `BUSINESS_TYPES` with emoji 🤝.
- `src/types/index.ts` includes `'agency'` in the `BusinessType` union.
- `src/pages/Onboarding.tsx` (lines 238–279) already groups Agency under "Connect & Earn Commission".
- `public.businesses.type` has no CHECK/enum constraint — DB accepts any of the 9 values.

So the code path is correct; the preview in the screenshot is a stale render of the pre-grouping version (it shows a flat 2‑column grid with 8 tiles). No DB mismatch exists.

## Plan
1. **Verify render in a fresh preview.** Reload the onboarding Step 2 in the running preview and confirm the five group headers ("Buy & Sell", "Connect & Earn Commission", "Deliver a Service", "Education", "Something else") appear and the Agency / Broker tile shows under "Connect & Earn Commission".
2. **If Agency still doesn't appear**, add a defensive fallback so any `BUSINESS_TYPES` entry not covered by a group is rendered under "Something else" — this guarantees every configured vertical is selectable even if a group `ids` list is accidentally out of sync.
3. **Sanity-check downstream** that saving `type: 'agency'` in `complete_onboarding` succeeds (no constraint on the column — should be fine) and that Agency's Partner Network auto-seed still fires.
4. **No DB migration required.**

## Files touched
- `src/pages/Onboarding.tsx` — only if step 2 fallback is needed.

Nothing else changes. No schema, no pricing, no routing edits.
