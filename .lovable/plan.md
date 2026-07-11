# Tasks — CRO & UX Overhaul (+ mobile keyboard bug fix)

## Why (psychology of an Indian SMB owner)

For an Indian business owner, "tasks" isn't project management — it's a **to-do diary for follow-ups, payments, site visits, staff nudges**. Today's screen is *feature-rich but heavy*: the Add Task form asks for 12+ fields upfront (voice, CC, reminders, recurrence, lead link, customer link, task type…). That's a wall. Owners abandon and go back to WhatsApp/paper.

Levers we pull:
1. **Effortless capture** — one-line quick-add at the top, everything else optional/expandable.
2. **Loss aversion** — surface overdue money-tasks ("₹ follow-up pending 4 days") first.
3. **Progress + streaks** — "8 done this week 🔥" — dopamine, not guilt.
4. **Familiar mental models** — grouped as *Aaj / Kal / Baaki* (Today / Tomorrow / Later) instead of only status columns.
5. **Trust** — clear "assigned to you" vs "assigned by you" split; owners want to see what staff owes them.

## Bug fix first — mobile "screen jumps to bottom when typing title"

Root cause in `Tasks.tsx` (mobile Drawer form):
- The form content has `max-h-[70vh] overflow-y-auto` **AND** its parent `DrawerContent > div` also has `overflow-y-auto` → **double scroll container**. When the on-screen keyboard opens, the browser calls `scrollIntoView` on the focused input, and the inner scroller (which has a huge `pb-32` bottom pad) scrolls all the way down, hiding the title behind the keyboard.
- Additionally `pb-32` (~128px) creates dead space that lets the content scroll far past the last field.

Fix:
- Remove the inner `max-h-[70vh] overflow-y-auto` — let the Drawer's own scroll container handle scrolling (single scroller).
- Reduce `pb-32` to `pb-8`; the Drawer already accounts for safe-area.
- Add `autoFocus={false}` behavior handled naturally; also ensure the Title input isn't inside a nested scroll region that fights the keyboard.

Verify on 390px viewport: tap Title → keyboard opens → Title stays visible, no jump.

## CRO/UX changes (presentation only, no schema)

### 1. One-line quick-add bar (top of page, mobile-first)
Replace the "Add Task" button-only entry with a **persistent quick-add bar** at the top of the Tasks screen:
- Big input, placeholder: `"Kya karna hai? e.g. Call Ramesh tomorrow 5pm"` (English fallback: `"What needs doing? e.g. Call Ramesh tomorrow 5pm"`)
- 🎤 mic (reuse `VoiceNoteRecorder`) + Enter to save as `todo / medium / no due date`
- Small "Add details" link opens the full Drawer/Dialog for power users
- Toast: `"Added ✓ — tap to set due date"` with an undo action

This is the single biggest CRO win: creating a task drops from ~10 taps to 1.

### 2. Insight strip (dopamine + loss aversion)
Row of 3 compact stat cards above filters:
- **Aaj ka focus**: `X due today` (clickable → filters to today)
- **Done this week**: `Y ✓` with a subtle streak flame if ≥5 (dopamine)
- **Pending from team**: `Z tasks assigned by you, still open` (owner accountability lens)

All computed from existing `tasks` client-side.

### 3. Smarter default grouping — "Aaj / Kal / Baaki / Done"
Currently My Tasks is a flat list with filter chips. New default view groups by time buckets (collapsible section headers):
- 🔴 **Overdue** (auto-expanded if >0)
- 📅 **Aaj / Today**
- ⏭️ **Kal / Tomorrow**
- 📆 **Is hafte / This week**
- 🗓️ **Baad mein / Later & no date**
- ✅ **Done** (collapsed by default)

Reorder inside each group by priority. Kanban and Calendar remain available as tab views for power users.

### 4. Card redesign — action-first, less noise
- Bigger tap target (mobile: min 56px height)
- Line 1: title (2 lines max) + priority dot (color only)
- Line 2: due chip (relative — `Aaj`, `Kal`, `2 din baad`, `Overdue 3d`) + assignee avatar/initial
- Right side: always-visible **✓ Done** circle (already exists) + **⋯** for delete/edit on mobile (currently trash is desktop-only, giving mobile users no delete)
- Overdue cards: keep red left border + subtle background tint; add a soft pulse on the dot for tasks overdue >3 days

### 5. Filter chips — reordered for owner intent
Current order: Overdue → Today → priority chips. Add:
- 🔥 **Money tasks** — filters where title matches `/payment|invoice|follow.?up|due|₹|rs\.?/i` (client-side heuristic, no schema change) — surfaces revenue-critical work
- 👤 **Assigned by me** — tasks the owner delegated (uses `created_by = user.id && assigned_to !== user.id`)
- Keep Overdue / Today / priority

Move the priority chips behind an overflow → owners rarely filter by priority; they filter by *when* and *who*.

### 6. Empty state — warm & directive
Replace generic `EmptyState` with:
- Emoji `✅`
- Copy: `"Aaj kya karna hai? Ek chhota kaam bhi likh do — 30 second."` (English: `"What needs doing today? Even one small task — 30 seconds.")`
- Two example chips that prefill the quick-add bar: `"Payment follow-up"`, `"Team meeting kal 11am"`, `"Site visit this week"` — beats blank-page paralysis

### 7. Detail form (Drawer/Dialog) — collapse advanced sections
The current form dumps 12+ fields in one scroll. Restructure into:
1. **Essentials** (always visible): Title, Due (date+time), Assign to, Priority
2. **Details** (collapsed by default): Description, Voice note, Task type, Link to Lead/Customer
3. **Automation** (collapsed by default): Recurrence, Reminders, CC/Loop

Reduces perceived complexity by ~70% on first open while keeping every field one tap away.

### 8. Micro-interactions & copy
- ✓ Done tap: subtle scale + confetti-lite check animation
- Overdue toast when marking done past due: `"Kar diya ✓ Better late than never"` — warm, no shame
- Recurring task auto-created: `"Next one on <date> — set 📆"` (already exists, keep)

## Out of scope
- No DB, RLS, edge function, or gating changes
- No new modules; existing Gantt / Calendar / AI Task Creator untouched
- No changes to `useSupabaseData` hooks

## Files touched
- `src/pages/Tasks.tsx` — full page refactor (quick-add bar, insight strip, grouped list, filter chips, empty state, form restructure, keyboard-jump fix)
- Optional: extract the quick-add bar into `src/components/tasks/TaskQuickAdd.tsx` for readability (~80 lines)

## Verification
- 390px mobile: tap Title in New Task drawer → keyboard opens → **Title remains visible, no jump to bottom**. Session-replay confirms.
- 390px mobile: quick-add bar + 🎤 fits on one row; grouped list renders single-column.
- 1440px desktop: insight strip inline, Kanban/Calendar tabs unchanged, grouped list renders same.
- Typecheck clean, no new deps, no schema migration.

Stop for review before implementation.
