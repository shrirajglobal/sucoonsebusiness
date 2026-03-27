

## Plan: Fix Task Creation Error, Screen Jumping, and Mobile Layout

### Issue 1: Task creation error — "violates foreign key constraint tasks_assigned_to_fkey"

**Root cause**: The `tasks.assigned_to` column has a foreign key reference to `auth.users(id)`. When a team member is selected whose `user_id` is null (or the team member's own `id` from the `team_members` table is used instead of their `auth.users` id), the FK constraint fails.

The same FK exists on `leads.assigned_to` and `customers.assigned_to`.

**Fix**: 
- Database migration to **drop the foreign key constraints** on `tasks.assigned_to`, `leads.assigned_to`, and `customers.assigned_to`. These columns store UUIDs that may reference team members without auth accounts, so the FK to `auth.users` is inappropriate.
- In `Tasks.tsx` line 313, `teamOptions` uses `m.user_id || m.id` — when `user_id` is null, it falls back to `m.id` (team_members table id), which is not in `auth.users`. Dropping the FK resolves this cleanly.

### Issue 2: Screen jumping when typing in forms on mobile

**Root cause**: The task form uses `Dialog` on desktop and `Drawer` on mobile. However, the drawer's `max-h-[90vh]` combined with `overflow-y-auto` on the inner content causes the viewport to jump when the mobile keyboard opens — the form content height changes and the focused input scrolls out of view.

CRM uses `Dialog` for both mobile and desktop (no Drawer), which is even worse on mobile — dialogs don't handle virtual keyboard well.

**Fix**:
- **Tasks.tsx**: Already uses Drawer on mobile — add proper scroll padding and ensure the form container uses `pb-[env(safe-area-inset-bottom)]` plus extra bottom padding so fields aren't hidden behind the keyboard. Change `max-h-[70vh]` on `taskFormContent` to a more keyboard-friendly approach.
- **CRM.tsx**: Switch to `Drawer` on mobile (like Tasks already does) with proper overflow handling.
- **IdeaBoard.tsx**: Already uses Drawer on mobile — apply same scroll fixes.
- For all three: Add `scroll-padding-bottom` and increase bottom padding in scrollable form areas to prevent keyboard occlusion.

### Issue 3: Mobile view layout issues

From the screenshot, the task list on mobile shows truncated titles, badges and delete buttons are cramped.

**Fix across all three pages**:

**Tasks.tsx (mobile list view)**:
- Stack title on its own line, badges below it instead of inline
- Hide the delete button behind the "More" menu on mobile (already partially done for header actions)
- Ensure task cards are full-width and not clipped

**CRM.tsx (mobile pipeline)**:
- The Kanban columns already use `min-w-[220px]` — reduce to better fit mobile
- Use `Drawer` instead of `Dialog` for lead form on mobile
- Improve lead card layout for narrow screens

**IdeaBoard.tsx (mobile)**:
- Cards grid already uses `grid-cols-1` on mobile — verify proper padding
- Ensure detail Sheet uses full width on mobile (already `w-full`)

### Files to modify

1. **Database migration** — Drop FK constraints on `assigned_to` columns for tasks, leads, customers
2. **`src/pages/Tasks.tsx`** — Fix mobile task card layout (stack badges below title, collapse delete into menu), increase form bottom padding
3. **`src/pages/CRM.tsx`** — Switch to Drawer on mobile for lead form, improve card layout
4. **`src/pages/IdeaBoard.tsx`** — Add form scroll padding fixes

### Technical Details

**Migration SQL**:
```sql
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_assigned_to_fkey;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_assigned_to_fkey;
```

**Mobile form fix pattern** (all three pages):
- Wrap form in `<div className="pb-32 overflow-y-auto">` to ensure enough scroll room below the last field
- Use `Drawer` component on mobile with `DrawerContent` that handles virtual keyboard better than Dialog

**Mobile card layout** (Tasks):
- Move badges and delete button to a second row below the title on mobile
- Use `flex-col` layout inside task cards when `isMobile` is true

