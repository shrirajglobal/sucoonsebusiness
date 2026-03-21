

# Idea Board, Task Enhancements & Voice Notes — Implementation Plan

This plan covers three major feature areas: a new Idea Board module, task/CRM enhancements (CC/Loop, reminders, templates, voice input), and a reusable Voice Note component.

---

## A. Idea Board (New Module)

A lightweight collaborative space where the business owner can capture ideas, tag team members, discuss, and optionally convert ideas into tasks.

### Database

**New table: `ideas`**
- `id` (uuid, PK)
- `business_id` (uuid, NOT NULL)
- `title` (text, NOT NULL)
- `description` (text)
- `voice_note_url` (text) — stored in Supabase Storage
- `created_by` (uuid, NOT NULL)
- `created_by_name` (text, default '')
- `status` (text, default 'open') — open / in_progress / converted / archived
- `priority` (text, default 'medium')
- `converted_task_id` (uuid) — links to tasks table if converted
- `tags` (text[])
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

**New table: `idea_members`** (people tagged/involved)
- `id` (uuid, PK)
- `idea_id` (uuid, FK → ideas, ON DELETE CASCADE)
- `user_id` (uuid, NOT NULL) — team member's user_id
- `user_name` (text, NOT NULL)
- `created_at` (timestamptz, default now())

**New table: `idea_comments`** (discussion thread)
- `id` (uuid, PK)
- `idea_id` (uuid, FK → ideas, ON DELETE CASCADE)
- `content` (text, NOT NULL)
- `voice_note_url` (text)
- `created_by` (uuid, NOT NULL)
- `user_name` (text, default '')
- `created_at` (timestamptz, default now())

**Storage bucket**: `voice-notes` (public)

RLS on all three tables: business_id check via ideas.business_id = get_user_business_id(auth.uid())

### Files
- **New**: `src/pages/IdeaBoard.tsx` — main page with card grid, add idea dialog, filters (status, priority), "Convert to Task" button
- **New**: `src/components/ideas/IdeaCard.tsx` — card showing title, description, tagged members, comment count, voice note playback
- **New**: `src/components/ideas/IdeaDetail.tsx` — dialog/sheet with full details, comments thread, voice note, convert-to-task action
- **Modified**: `src/App.tsx` — add `/ideas` route
- **Modified**: `src/components/layout/AppLayout.tsx` — add "Idea Board" nav item (Lightbulb icon) in Core group
- **Modified**: `src/hooks/useSupabaseData.ts` — add useIdeas, useCreateIdea, useIdeaComments, useCreateIdeaComment hooks

### Convert to Task Flow
- Button on idea card → pre-fills task creation dialog with idea title/description
- On success, updates idea's `status` to 'converted' and sets `converted_task_id`

---

## B. Task & Lead Enhancements

### B1. CC/Loop on Tasks

**Database change**: New table `task_watchers`
- `id` (uuid, PK)
- `task_id` (uuid, FK → tasks, ON DELETE CASCADE)
- `user_id` (uuid, NOT NULL)
- `user_name` (text, NOT NULL)
- `created_at` (timestamptz, default now())

RLS: via tasks.business_id check

**UI changes in `src/pages/Tasks.tsx`**:
- Add multi-select "CC / Loop" field in task form using SearchableSelect (allow multiple)
- Store selected watchers in `task_watchers` table on save
- New sub-tab "Looped In" alongside existing views — shows tasks where current user is in task_watchers

**Hooks**: `useTaskWatchers(taskId)`, `useCreateTaskWatcher`, `useMyWatchedTasks()`

### B2. Reminders on Tasks

**Database change**: New table `task_reminders`
- `id` (uuid, PK)
- `task_id` (uuid, FK → tasks, ON DELETE CASCADE)
- `remind_at` (timestamptz, NOT NULL)
- `channels` (text[], NOT NULL) — ['web', 'whatsapp', 'email']
- `is_sent` (boolean, default false)
- `created_by` (uuid, NOT NULL)
- `created_at` (timestamptz, default now())

RLS: via tasks.business_id check

**UI in task form**:
- "Add Reminder" section — user picks date/time + checkboxes for Web/WhatsApp/Email
- Can add multiple reminders per task
- Display as chips below the field, removable

**Note**: Actual WhatsApp/Email sending is deferred (requires external integrations). Web notifications will show as in-app toast/badge. The reminder infrastructure is built now; delivery channels will be connected later.

### B3. Voice Input for AI Task Creator

**Changes to `src/components/tasks/AITaskCreator.tsx`**:
- Add a microphone button next to the text area
- Use browser's `MediaRecorder` API to record audio
- Send audio to a new edge function `voice-transcribe` that uses Lovable AI (Gemini) to transcribe
- Transcribed text fills the prompt textarea, then existing AI parsing flow runs

**New**: `supabase/functions/voice-transcribe/index.ts` — accepts audio blob, sends to Gemini for transcription, returns text

### B4. Task Templates

**New**: `src/lib/taskTemplates.ts` — predefined templates array:
```text
- Follow-up Call (priority: high, type: Sales, recurrence: none)
- Weekly Team Meeting (priority: medium, recurrence: weekly)
- Invoice Follow-up (priority: high, type: Finance)
- Site Visit (priority: medium, type: Field)
- Vendor Payment Reminder (priority: high, type: Finance, recurrence: monthly)
- Client Onboarding (priority: high, type: Operations)
- Social Media Post (priority: low, type: Marketing, recurrence: daily)
- Stock Reorder Check (priority: medium, type: Inventory, recurrence: weekly)
```

**UI in `src/pages/Tasks.tsx`**:
- "Use Template" button in task creation dialog
- Opens a dropdown/list of templates
- Selecting a template pre-fills title, priority, type, recurrence fields
- User can then customize before saving

---

## C. Voice Note Component (Reusable)

**New**: `src/components/shared/VoiceNoteRecorder.tsx`
- Record button (mic icon) → recording state with timer → stop → preview playback
- Uses `MediaRecorder` API (browser-native, no library needed)
- Uploads recorded audio to `voice-notes` storage bucket
- Returns the public URL via `onRecorded(url: string)` callback
- Props: `onRecorded`, `existingUrl?` (for playback of existing note)

**New**: `src/components/shared/VoiceNotePlayer.tsx`
- Simple audio player with play/pause, duration display
- Used wherever voice notes are displayed

**Integration points**:
- Idea Board: idea creation + comments
- Lead Notes (`src/components/crm/LeadNotes.tsx`): add voice note when logging activity
- Task Notes (`src/components/tasks/TaskNotes.tsx`): add voice note to task notes
- AI Task Creator: voice-to-text input

**Database changes for voice notes**:
- Add `voice_note_url` (text) column to `lead_notes` table
- Add `voice_note_url` (text) column to `task_notes` table

---

## Technical Details

### Migration (single SQL file)
```text
1. CREATE TABLE ideas (with RLS)
2. CREATE TABLE idea_members (with RLS)
3. CREATE TABLE idea_comments (with RLS)
4. CREATE TABLE task_watchers (with RLS)
5. CREATE TABLE task_reminders (with RLS)
6. ALTER TABLE lead_notes ADD COLUMN voice_note_url text
7. ALTER TABLE task_notes ADD COLUMN voice_note_url text
8. INSERT INTO storage.buckets (id, name, public) VALUES ('voice-notes', 'voice-notes', true)
9. Storage RLS policies for voice-notes bucket
```

### New Files (10)
- `src/pages/IdeaBoard.tsx`
- `src/components/ideas/IdeaCard.tsx`
- `src/components/ideas/IdeaDetail.tsx`
- `src/components/shared/VoiceNoteRecorder.tsx`
- `src/components/shared/VoiceNotePlayer.tsx`
- `src/lib/taskTemplates.ts`
- `supabase/functions/voice-transcribe/index.ts`

### Modified Files (7)
- `src/App.tsx` — add /ideas route
- `src/components/layout/AppLayout.tsx` — add Idea Board nav
- `src/hooks/useSupabaseData.ts` — add hooks for ideas, watchers, reminders
- `src/pages/Tasks.tsx` — CC/Loop field, reminders UI, templates selector, "Looped In" tab
- `src/components/tasks/AITaskCreator.tsx` — voice input button
- `src/components/crm/LeadNotes.tsx` — voice note attachment
- `src/components/tasks/TaskNotes.tsx` — voice note attachment

### Implementation Order
1. Database migration (all tables + storage)
2. VoiceNoteRecorder + VoiceNotePlayer components
3. voice-transcribe edge function
4. Idea Board page + components
5. Task enhancements (CC/Loop, reminders, templates, voice AI input)
6. Voice note integration in LeadNotes + TaskNotes

