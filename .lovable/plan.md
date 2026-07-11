# Idea Board — CRO & UX Overhaul

## Why (psychology of an Indian business owner)

An Indian SMB owner uses an "idea board" like a **paper diary + WhatsApp broadcast**: they get flashes of ideas while driving, in the shop, between calls. Today's board asks too much upfront (title, priority, tag members) and doesn't reward them after capture. Ideas pile up as clutter, nothing converts, and the tool feels like homework. We need to make it feel like *jotting into a diary and then getting nudged to act*.

Key psychological levers:
1. **Effortless capture** — remove friction to the first keystroke. Reward with confirmation and streaks.
2. **Loss aversion** — show what's slipping ("3 ideas older than 30 days, no action"). Owners hate wastage.
3. **Progress visibility** — show conversion rate (ideas → tasks → done). This is the ROI they feel proud of.
4. **Trust / control** — clear "who can see this" cues; owners are private about half-baked ideas.
5. **Familiar patterns** — voice-first (like WhatsApp), Hindi-friendly placeholder tone, minimal English jargon.

## What changes (UX + copy, no schema changes)

### 1. Hero capture bar — the "diary line"
Replace the current thin quick-add with a bigger, warmer capture zone at the very top:
- Prominent input, autofocus on page load: placeholder `"Kya idea aaya? Type or record…"` (English fallback: `"What's the idea? Type it or tap 🎤"`)
- Inline **🎤 record** button (uses existing `VoiceNoteRecorder`) and **📷 attach** later hook
- Enter key or tap ➜ saves as `open / medium` instantly, shows toast `"Captured ✓ — added to your board"`
- Sub-line micro-copy: `"Sirf title kaafi hai. Details baad mein add karo."` (small, muted)

Removes the "New Idea" modal as the *default* path — it becomes an optional "Add details" link under the bar for power users.

### 2. Insight strip (loss-aversion + progress)
A single horizontal row of 3 small stat cards above the filter chips:
- **This week**: `X ideas captured` (dopamine)
- **Converted**: `Y → tasks` with conversion % (progress)
- **Needs action**: `Z ideas open >14 days` (loss aversion, clickable → filters to stale)

These are computed client-side from existing `ideas` data — no backend work.

### 3. Filter chips — reordered by intent
Current order dumps "Archived" in the flow. Reorder + rename for Indian owner mental model:
- `All` · `🔥 Action needed` (open >14d) · `Open` · `In Progress` · `Converted ✓` · `Archived`
- The "Action needed" chip is the CRO win: pushes stale ideas to the top of mind.

### 4. Card redesign — scannable, action-first
Today's cards bury the "Convert to Task" CTA inside a sheet. New card layout:
- Title (2 lines max) + priority dot (colour only, no badge — less noise)
- Description snippet (1 line)
- Bottom row: relative time · tagged avatars · **inline `Convert →` icon button** (hover/tap reveals on mobile always visible)
- Pinned ideas: keep left border accent but also a subtle warm background tint so it *feels* pinned
- Stale ideas (>14d, still `open`): faint amber dot on the corner + tooltip `"Untouched for 14 days"`

### 5. Detail sheet — action ladder
Reorder buttons by *what the owner most likely wants next*:
1. **Convert to Task** (primary, full width, top)
2. Discussion (comments) surfaced higher
3. Edit / Copy / Pin as secondary row
4. Delete demoted to icon-only in a menu (prevents fat-finger loss)

### 6. Empty state — warm & directive
Replace generic empty state with:
- Illustration/emoji `💡`
- Copy: `"Har bada business ek chhoti idea se shuru hota hai."` / `"Every big business starts with one small idea."`
- Two example prompts as clickable chips that pre-fill the capture bar: `"New product idea"`, `"Marketing thought"`, `"Team suggestion"` — reduces blank-page paralysis.

### 7. Bulk actions on stale ideas (mini nudge)
When "Action needed" filter is active and count > 0, a banner strip appears:
`"You have 5 ideas untouched. Archive old ones or convert the good ones."` with two buttons: `Convert best one →` (opens top-priority open idea's detail) and `Archive all older than 30d` (with confirm).

### 8. Micro-interactions & copy
- Success toasts get personality: `"Captured ✓"`, `"Pinned to top 📌"`, `"Turned into a task ➜"`.
- Convert action shows a mini-celebration (small check animation) — reinforces the ROI moment.
- Card hover: subtle lift already present, add cursor-hint `"Tap to open discussion"`.

## Out of scope
- No DB schema changes, no new tables, no RLS changes.
- No new edge functions.
- No AI features (that lives in Assistant / AI Task Creator already).
- Existing voice-note, tagging, comments infrastructure reused as-is.

## Files touched
- `src/pages/IdeaBoard.tsx` — main refactor (capture bar, insight strip, cards, filter chips, detail sheet reorder, stale banner, empty state).
- `src/components/shared/EmptyState.tsx` — only if a small prop is needed for example chips; otherwise inline in IdeaBoard.

## Verification
- 375px mobile: capture bar + 🎤 fits one row; insight strip scrolls horizontally if needed; cards single column.
- 1440px desktop: 3-col grid, insight strip inline.
- Typecheck clean, no new deps.

Stop for review before implementation.
