

# Idea Board Fixes

## 1. Team member names not visible in idea cards

**Problem**: Idea cards don't show tagged members. The `idea_members` data is only fetched inside the detail sheet (`IdeaMembersSection`), not on the card grid. The card component at line 261-273 has no member display.

**Fix in `src/pages/IdeaBoard.tsx`**:
- Fetch all `idea_members` for the business in bulk (single query filtered by idea IDs) instead of per-idea
- Display member names as small badges on each idea card
- Replace the current flat `SearchableSelect` for tagging members with the existing reusable component (already used, but ensure it works — the issue is likely that `teamOptions` filters by `m.user_id` which excludes members who haven't joined yet). Show all team members by name regardless of `user_id` status, since tagging doesn't require auth linkage.

## 2. Convert to Task should open pre-filled task form

**Current behavior** (line 139-158): `handleConvertToTask` silently creates a task with only title, description, priority, and status — no user input. The user never sees a form.

**Fix**:
- Instead of directly calling `createTask.mutateAsync`, open the Tasks page task creation dialog pre-filled with the idea's data
- Approach: Use `navigate('/tasks', { state: { fromIdea: idea } })` to pass idea data to the Tasks page
- In `Tasks.tsx`, check `location.state?.fromIdea` on mount — if present, pre-fill the form fields (title, description, priority) and open the dialog automatically
- After successful task creation in Tasks, update the idea's status to 'converted' and set `converted_task_id`
- Store idea ID in form state so the conversion update happens on save

## 3. Move Idea Board right after Dashboard in nav

**Fix in `src/components/layout/AppLayout.tsx`**:
- Move `{ path: '/ideas', label: 'Idea Board', icon: Lightbulb, module: 'ideas' }` from position 9 (after Card Scanner) to position 2 (right after Dashboard, before Tasks)

## Files to Change

### `src/components/layout/AppLayout.tsx`
- Reorder nav: move Idea Board entry to index 1 (after Dashboard)

### `src/pages/IdeaBoard.tsx`
- Bulk-fetch idea_members for all visible ideas to show on cards
- Fix teamOptions to include all team members (not just those with user_id) since tagging is name-based
- Replace direct task creation with navigation to Tasks page with pre-filled state

### `src/pages/Tasks.tsx`
- On mount, check `location.state?.fromIdea` — if present, pre-fill form and open dialog
- Add `fromIdeaId` to form state; on save, update the idea's status to 'converted'

