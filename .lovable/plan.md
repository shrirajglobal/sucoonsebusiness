

# Task Section Enhancements for Indian SMB Owners

## Pain Point Analysis

An Indian small business owner's daily reality with tasks:
- "Har Monday ko supplier ko call karna hai" — **Recurring tasks** are missing entirely
- Opens task list in the morning and wants to see **"Aaj kya karna hai?"** — no "My Day" focus view
- Assigns work to team but can't see **who is doing what** in the list
- Marks a task done but then needs to **create the same follow-up again** manually
- Has 50+ tasks and wants to **quickly mark 5 as done** without opening each one
- Created a lead-related task but **can't link it to the CRM lead**
- Wants to add a note like "Ramesh said call back Thursday" **without editing the whole task**

## What Exists Today
- List / Kanban / Calendar views
- Subtask checklists
- AI task creator
- Gantt + time tracking
- Priority, status, due date, assigned_to, task_type filters
- Export CSV/PDF

## What's Missing (High Impact)

### 1. "My Day" Summary Strip at Top
A quick glanceable section above the task list showing:
- Overdue count (red), Due Today count (orange), Upcoming 3 days (blue)
- Clicking each filters the list instantly
- This is what the owner checks first thing in the morning

### 2. Quick-Done Toggle (One-Tap Complete)
- Add a checkbox/circle on each task card in list and kanban views
- Clicking it instantly toggles status to "done" (or back to "todo")
- No dialog needed — biggest time saver for daily use

### 3. Recurring Tasks
- Add a "Repeat" option in task form: None, Daily, Weekly, Monthly, Custom (every N days)
- When a recurring task is marked done, auto-create the next occurrence with shifted due date
- Database: add `recurrence` (jsonb, nullable) column to tasks table
- Handles: weekly supplier calls, monthly GST filing reminders, daily stock checks

### 4. Task Notes / Activity Feed
- Add a simple notes/comments section inside the task edit dialog (below subtasks)
- Database: new `task_notes` table (id, task_id, content, created_by, user_name, created_at)
- Each note timestamped — acts as a mini conversation log
- "Supplier said dispatch by Friday" type quick updates

### 5. Linked Lead Display
- `linked_lead_id` column already exists in tasks table but has no UI
- Add a "Link to Lead" dropdown in the task form showing current leads
- Show linked lead name as a clickable badge on task cards

### 6. Filter by Assigned Person
- Add an "Assigned To" filter dropdown alongside status and priority filters
- Shows owner + team members
- Critical for owners managing 3-10 staff

### 7. Bulk Actions
- Add checkbox selection mode on list view
- "Select All" + action bar: Mark Done, Change Priority, Delete Selected
- Speeds up end-of-day cleanup dramatically

---

## Technical Details

### Database Migration
```sql
-- Recurrence support
ALTER TABLE public.tasks ADD COLUMN recurrence jsonb DEFAULT NULL;
-- e.g. {"type": "weekly", "interval": 1, "days": ["mon"]}

-- Task notes table
CREATE TABLE public.task_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_notes ENABLE ROW LEVEL SECURITY;
-- RLS: same business check via tasks join
```

### Files to Create
- `src/components/tasks/TaskNotes.tsx` — notes/comments component
- `src/components/tasks/MyDaySummary.tsx` — overdue/today/upcoming strip
- `src/components/tasks/RecurrenceSelect.tsx` — repeat picker UI

### Files to Modify
- `src/pages/Tasks.tsx` — My Day strip, quick-done toggle, bulk actions, assigned filter, linked lead dropdown, recurrence in form
- `src/hooks/useSupabaseData.ts` — add `useTaskNotes`, `useCreateTaskNote`, bulk update mutation
- `src/lib/constants.ts` — recurrence options config

### Scope
- 1 migration (recurrence column + task_notes table + RLS)
- 3 new components
- ~2 files modified significantly

