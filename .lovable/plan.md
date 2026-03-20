

# Settings, Tasks & CRM Enhancements

## 1. Settings — Role Assignment & Designation

**Current problem**: Role dropdown uses `defaultValue="executive"` instead of fetching the member's actual current role. No "Designation" field exists on team members.

**Fix**:
- Add `designation` column to `team_members` table (migration)
- Add Designation field in member form (Settings.tsx)
- Fix role dropdown to fetch and display each member's actual role from `user_roles` table
- Use a proper Select with the member's real role as default value

## 2. Tasks — Searchable Assigned To & Link to Lead/Customer

**Current problem**: Dropdowns list all team members and leads in flat lists. With 100+ entries, this is unusable.

**Solution**: Replace `<Select>` dropdowns with searchable Combobox (using cmdk Command component already in the project) for:
- **Assigned To**: Searchable with team member names, shows department as hint
- **Link to Lead**: Searchable combobox showing lead name + company
- **Link to Customer** (new): Add a `linked_customer_id` column to tasks table. Searchable combobox showing customer name + company. User can link to either a lead OR a customer.

**Implementation**:
- Create `src/components/shared/SearchableSelect.tsx` — reusable Popover + Command combo
- Update Tasks.tsx form to use SearchableSelect for Assigned To, Link to Lead, Link to Customer
- Add `linked_customer_id` column to tasks table (migration)
- Update filter dropdowns for Assigned To to also be searchable

## 3. CRM — Comprehensive Enhancement for Indian SMB

**Current pain points analyzed**:
- No filters by stage, source, assigned person, or city
- No "pipeline summary" showing conversion rates or stage-wise counts
- No follow-up/next action date tracking on leads
- No quick-add follow-up note without editing the full lead
- No bulk actions (delete, change stage)
- Lead detail page has minimal activity timeline (only created/updated)
- No "product interest" field usage in UI despite column existing
- No tags usage in UI despite column existing

**Enhancements**:

### 3a. Pipeline Summary Strip (like My Day for Tasks)
- Show: Total leads, Total pipeline value, Stage-wise count bar, Won/Lost counts
- Clickable to filter by stage

### 3b. Advanced Filters
- Filter by: Stage, Source, Assigned To (searchable), City, Date range
- Filter bar below search, collapsible on mobile

### 3c. Follow-Up Date on Leads
- Add `next_follow_up` (date) column to leads table
- Show in lead form and on lead cards
- Highlight overdue follow-ups in red
- "Due Today" and "Overdue" quick filters

### 3d. Quick Follow-Up Notes (Lead Activity Log)
- Create `lead_notes` table (id, lead_id, content, created_by, user_name, created_at, note_type)
- Add note types: call, meeting, whatsapp, email, note
- Show on LeadDetail page as proper activity timeline
- Quick "Add Note" button on lead cards without opening full edit

### 3e. Product Interest & Tags in UI
- Show product_interest field in lead form
- Show tags as editable chips in lead form
- Display on lead cards

### 3f. Bulk Actions on List View
- Checkbox selection + "Change Stage", "Delete Selected"

---

## Technical Details

### Database Migration
```sql
-- Designation for team members
ALTER TABLE public.team_members ADD COLUMN designation text;

-- Customer link on tasks
ALTER TABLE public.tasks ADD COLUMN linked_customer_id uuid;

-- Follow-up date on leads
ALTER TABLE public.leads ADD COLUMN next_follow_up date;

-- Lead notes table
CREATE TABLE public.lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  content text NOT NULL,
  note_type text NOT NULL DEFAULT 'note',
  created_by uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
-- RLS via leads business check
```

### Files to Create
- `src/components/shared/SearchableSelect.tsx` — reusable Popover+Command combobox
- `src/components/crm/PipelineSummary.tsx` — pipeline stats strip
- `src/components/crm/LeadNotes.tsx` — activity log for leads
- `src/components/crm/LeadFilters.tsx` — advanced filter bar

### Files to Modify
- `src/pages/Settings.tsx` — add designation field, fix role dropdown to show actual role
- `src/pages/Tasks.tsx` — replace Select with SearchableSelect for assigned/lead/customer
- `src/pages/CRM.tsx` — pipeline summary, filters, follow-up date, product interest, tags, bulk actions
- `src/pages/LeadDetail.tsx` — lead notes activity timeline, follow-up display
- `src/hooks/useSupabaseData.ts` — add useLeadNotes, useCreateLeadNote hooks

### Scope
- 1 migration (4 schema changes + 1 new table + RLS)
- 4 new components
- 5 files modified significantly

