

# Idea Board & Task Section — Bug Fixes, Mobile Parity, and CRO Enhancements

---

## Bug Fixes

### 1. Task save error when converting from Idea Board
**Root cause**: In `Tasks.tsx` line 172, the inline `supabase.from('tasks').insert(...)` passes `linked_customer_id` which may conflict with type expectations, and uses `.select('id').single()` which can fail. The `as any` casting masks the real issue — if the insert fails (e.g., missing required fields or type mismatch), the error bubbles up cryptically.

**Fix**: Use `createTask.mutateAsync()` for new tasks (same as AITaskCreator does), and handle the return value differently. Refactor `handleSave` to use the hook for creation, then separately fetch the created task ID for watchers/reminders. Alternatively, fix the direct insert to properly return the ID using `.select().single()` with correct typing.

### 2. Voice note button missing in task creation form
**Root cause**: The task form (lines 421-542) has no `VoiceNoteRecorder` component. It exists only in `TaskNotes` (for existing tasks) and `AITaskCreator`.

**Fix**: Add a VoiceNoteRecorder to the task creation/edit form, store the URL in a `voice_note_url` state, and save it alongside the task. This requires adding a `voice_note_url` column to the `tasks` table.

---

## Mobile Parity Fixes

### 3. Task page toolbar overflow on mobile
The header has Export, AI Task, Gantt, and Add Task buttons all in one row — too many for 390px.

**Fix**: On mobile, collapse secondary actions (Export, Gantt) into a "More" dropdown menu. Keep only "AI Task" and "Add Task" visible. Use `useIsMobile()` hook.

### 4. Idea Board mobile improvements
- Detail sheet: already uses `w-full sm:max-w-md` — good
- Filters row: the search + status select need stacking on mobile
- Card grid: already `grid-cols-1` on mobile — good
- New Idea dialog: needs full-screen on mobile using responsive Dialog/Drawer pattern

### 5. Task creation dialog on mobile
The form dialog is too small on mobile. Use Drawer on mobile, Dialog on desktop (responsive pattern).

---

## CRO Enhancements — Idea Board (MSME Owner perspective)

### 6. Idea status quick-change
Allow changing idea status directly from the card (dropdown on status badge) without opening detail sheet. MSMEs need speed.

### 7. Edit idea inline
Currently no way to edit an idea's title/description/priority after creation. Add edit capability in the detail sheet.

### 8. Idea detail — richer action options
When clicking an idea, provide these actions:
- **Edit** idea (title, description, priority, tags, voice note)
- **Change status** (open → in_progress → converted/archived)
- **Convert to Task** (existing, pre-filled)
- **Share/Copy** idea text (clipboard)
- **Pin idea** (sort pinned ideas to top) — needs `is_pinned` column
- **Add attachments** — deferred, but UI placeholder
- **Delete** with confirmation

### 9. Idea count badges on filter tabs
Show count next to each status filter option so MSME owner can see at a glance how many open vs in-progress vs converted ideas exist.

### 10. Quick-add idea (single input bar)
Add a quick-add bar at the top (like a "What's on your mind?" input) — type title, press Enter, idea is created with defaults. The full dialog is for detailed capture. This is CRO-critical for fast capture.

---

## CRO Enhancements — Task Section (MSME Owner perspective)

### 11. Task due time field
Add `due_time` input next to due date in the task form. The column already exists in the DB.

### 12. Voice note on task creation
Add VoiceNoteRecorder in task form (both new + edit). Add `voice_note_url` text column to `tasks` table via migration.

### 13. Task description voice-to-text
In the task form description field, add a small mic button that records and fills description via transcription (reuse voice-transcribe edge function).

### 14. Overdue task highlight
In the task list, visually highlight overdue tasks with a red left border or background tint so they stand out immediately.

### 15. Quick filters as chips
Replace the dropdown filters with tappable chips on mobile: "Overdue (3)" "Today (5)" "High Priority (2)" — faster for MSME owners on the go.

---

## Database Migration

```sql
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS voice_note_url text;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
```

---

## Implementation Order

1. **DB migration** (voice_note_url on tasks, is_pinned on ideas)
2. **Bug fix**: Task save error in handleSave
3. **Bug fix**: Add VoiceNoteRecorder to task form
4. **Mobile parity**: Responsive toolbar, responsive dialogs (Drawer on mobile)
5. **Idea Board CRO**: Quick-add bar, edit idea, status quick-change, pin ideas, detail sheet actions
6. **Task CRO**: Due time field, overdue highlight, quick filter chips

### Files to Change
| File | Change |
|------|--------|
| `src/pages/Tasks.tsx` | Fix handleSave, add voice note, due time, responsive toolbar, overdue highlight, quick chips |
| `src/pages/IdeaBoard.tsx` | Quick-add bar, edit idea, pin, status change, detail actions, mobile responsive |
| `src/components/tasks/AITaskCreator.tsx` | No changes needed (voice already works) |
| DB migration | Add voice_note_url to tasks, is_pinned to ideas |

