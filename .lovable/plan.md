

# Fix Lead Insert Error & Improve CRM Mobile View

## Bug: Foreign Key Violation on `assigned_to`

**Root cause**: `leads.assigned_to` has a foreign key constraint referencing `auth.users(id)`. But `teamOptions` in CRM uses `m.user_id || m.id` — when a team member hasn't joined yet (no `user_id`), it falls back to `m.id` (the `team_members` table PK), which is NOT a valid `auth.users` UUID.

**Fix in `src/pages/CRM.tsx`**:
- Filter out team members without a `user_id` from the options list (they can't be assigned since they're not real users yet)
- OR only include `m.user_id` and skip members where `user_id` is null
- Change line 147: `teamMembers.filter(m => m.user_id).forEach(...)` to only show members who have linked user accounts

## Mobile View Improvements in `src/pages/CRM.tsx`

Current issues on mobile:
1. **Header row** — "CRM & Leads" + "Export" + "Add Lead" buttons overflow on small screens
2. **Pipeline summary cards** — 4 cards with long currency values overflow
3. **Stage pills** — horizontal scrolling not enabled, wraps awkwardly
4. **Kanban columns** — `min-w-[260px]` works but takes up too much space on mobile; should default to List view on mobile
5. **Lead form dialog** — `grid-cols-2` fields are too cramped on mobile (phone/email, value/source, stage/assigned)
6. **List view cards** — checkbox + name + value + delete button all cramped

**Changes**:
- Header: stack title and buttons on mobile (`flex-col sm:flex-row`)
- Pipeline summary: already `grid-cols-2 sm:grid-cols-4` — looks OK, but add `text-sm` for currency values to prevent overflow
- Stage pills: add `overflow-x-auto` with `flex-nowrap` on mobile
- Kanban: reduce `min-w-[260px]` to `min-w-[220px]` on mobile
- Lead form: change `grid-cols-2` to `grid-cols-1 sm:grid-cols-2` for all 2-column grids in the dialog
- List view: make value and delete stack better on mobile, reduce padding

## Files to Change

### `src/pages/CRM.tsx`
- Fix `teamOptions` to only include members with valid `user_id`
- Make header responsive (stack on mobile)
- Make dialog form fields single-column on mobile
- Reduce kanban card min-width for mobile
- Improve list view card layout for mobile

### `src/components/crm/PipelineSummary.tsx`
- Truncate long currency values
- Make stage pills horizontally scrollable

### `src/components/crm/LeadFilters.tsx`
- Make filter dropdowns full-width on mobile when expanded

