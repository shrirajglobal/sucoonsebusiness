

# Fix AI Task Creator to Extract All Available Fields

## Problem
The AI Task Creator's system prompt only asks the AI to extract 4 fields: `title`, `description`, `priority`, `due_date`. But tasks support additional fields — `recurrence`, `task_type`, `assigned_to` — that can often be inferred from natural language. For example, "Call Minu for coffee every month" should set recurrence to monthly, but it doesn't.

The `createTask.mutateAsync` call also doesn't pass recurrence or task_type from the parsed response.

## Solution

### 1. Update the AI system prompt in `AITaskCreator.tsx`
Expand the JSON schema the AI is asked to return to include:
- `recurrence` — object with `type` ("none"|"daily"|"weekly"|"monthly"|"custom") and optional `interval` (number for custom)
- `task_type` — string matching business task types (injected dynamically from `business.task_types`)
- `assigned_to` — team member name (matched against team members list, injected dynamically)

The component will need access to `useBusiness()` and `useTeamMembers()` to inject context into the prompt.

### 2. Match assigned_to name to UUID
AI returns a name string. After parsing, fuzzy-match it against `teamMembers` to find the UUID. If no match, leave null.

### 3. Pass all parsed fields to `createTask.mutateAsync`
Add `recurrence`, `task_type`, and `assigned_to` (resolved UUID) to the mutation call.

## Technical Details

### File: `src/components/tasks/AITaskCreator.tsx`
- Import `useBusiness`, `useTeamMembers` from hooks
- Build dynamic system prompt including available task types and team member names
- Expand requested JSON fields to include `recurrence`, `task_type`, `assigned_to_name`
- After parsing: resolve `assigned_to_name` → UUID via team members lookup
- Pass `recurrence`, `task_type`, `assigned_to` to `createTask.mutateAsync`

### No other files need changes
The edge function and database already support all these fields.

