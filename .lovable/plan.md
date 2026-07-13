## Root causes (audit findings)

1. **Massive initial bundle.** `src/App.tsx` eagerly imports all ~40 page components (Dashboard, Tasks, CRM, Partners, FeePlans, Analytics, GanttTasks, SuperAdmin, Assistant, IdeaBoard 767 LOC, Tasks 960 LOC, etc.). Every login pays the cost of every page — this is the single biggest reason the app "feels slow" on first paint.
2. **React Query has no defaults.** `new QueryClient()` in `App.tsx:50` uses library defaults: `staleTime: 0` and `refetchOnWindowFocus: true`. Every tab switch / re-mount refires the same queries. Combined with 30+ `useQuery` hooks across the app this triggers a storm of backend round-trips.
3. **Dashboard fetches everything unconditionally.** It calls `useTasks`, `useLeads`, `useCustomers`, `useAttendance`, `useInventory`, `useTransactions` in parallel on every mount — even for verticals where inventory/attendance aren't relevant. Each is a full-table read.
4. **Session replay confirms symptom.** Continuous 8–10s spinner cycling = queries repeatedly refetching / being invalidated. Consistent with #2.
5. **No secondary tuning.** No `React.memo` on heavy list rows, no `select` narrowing in queries, and a few pages fetch full rows just to count them.

## Fix plan (no feature/functionality loss)

### A. Code-split routes (biggest single win)
- In `src/App.tsx`, convert every page import to `React.lazy(() => import(...))` except `Landing`, `Login`, `Signup` (needed immediately).
- Wrap `<Routes>` in `<Suspense fallback={<PageLoader/>}>` using the existing `Loader2` spinner.
- Keeps the exact same routes and behavior — just splits the JS.

### B. Configure React Query sensibly
In `src/App.tsx`:
```
new QueryClient({ defaultOptions: { queries: {
  staleTime: 60_000,               // 1 min: matches typical CRM cadence
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: false,
  retry: 1,
}}})
```
Mutations already call `invalidateQueries` explicitly, so freshness is preserved after any write.

### C. Gate vertical-irrelevant queries in Dashboard
`src/pages/Dashboard.tsx`: pass `{ enabled: flags.holds_inventory }` for `useInventory`, and similar checks for attendance/retainers. Non-relevant verticals stop paying for those reads. All existing UI blocks already conditionally render behind capability flags — this only aligns fetching with rendering.

### D. Narrow a few hot reads
- `useTasks`, `useLeads`, `useCustomers`: use PostgREST `select()` with only the columns the list views actually read (removes ~30–60% row payload).
- Preserve existing return shapes by keeping the same field names; detail pages already use their own `useTask(id)` / `useLead(id)` hooks for full records.

### E. Small render-side wins
- Wrap `TaskCard` and `LeadCard` row components in `React.memo`.
- Replace one or two `.filter().length` chains in Dashboard `useMemo` with a single pass.

## Out of scope (call out, do not touch)
- No schema changes.
- No RLS / policy changes.
- No changes to auth, onboarding, gating, or Partner Network / Fee Plans logic.
- Edge functions untouched.

## Verification
- `bunx tsgo --noEmit` clean.
- Manual: hard-reload → confirm smaller initial JS (Network tab), Dashboard renders < 1s on warm cache, tab-switching no longer triggers a spinner cycle.
- Playwright smoke: login → Dashboard → Tasks → CRM → Partners, screenshot each, confirm no regressions.

## Files touched
- `src/App.tsx` (lazy imports + QueryClient config + Suspense)
- `src/pages/Dashboard.tsx` (conditional `enabled` on queries; memo tightening)
- `src/hooks/useSupabaseData.ts` (narrow `select()` on list queries only)
- `src/components/tasks/TaskCard.tsx`, `src/components/crm/*Card.tsx` (memo wrap)

Estimated impact: first-load JS ~60–70% smaller; steady-state backend calls per navigation ~50% fewer; visible responsiveness improvement across every screen.
