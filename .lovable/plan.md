

# Settings Enhancements Plan

## Overview
Three changes: (1) Rich team member form with full details + salary, (2) GST number on business info, (3) Feature parity between mobile and desktop layouts.

---

## 1. Enhanced Team Member Management

**Current state**: Only a name field for adding team members. No salary column in the database.

**Changes**:
- **Database migration**: Add `salary` (numeric, nullable, default 0) column to `team_members` table
- **Settings.tsx — Team tab**: Replace the single-line "Name" input with a proper multi-field form:
  - Name (required), Email, Phone, Department, Salary, Role selector
  - Show all these details in the member list cards (not just name + department)
  - Add an "Update" capability via `useUpdateTeamMember` hook (new) so existing members can be edited
- **Add `useUpdateTeamMember` hook** in `useSupabaseData.ts`
- **Role permissions display**: Add a small info section or tooltip showing what each role can do (owner: everything, admin: manage team/settings, manager: manage tasks/leads, executive: view + create, field_staff: limited view)

## 2. Business GST Number

**Current state**: `businesses` table has no `gst_number` column. Vendors have it, but the business itself doesn't.

**Changes**:
- **Database migration**: Add `gst_number` (text, nullable) column to `businesses` table
- **Settings.tsx — Workspace tab**: Add a "GSTIN (Optional)" input field in the Business Branding card
- **Finance/export pages**: Where business GST is relevant (e.g., invoice headers), reference `business.gst_number`

## 3. Mobile-Desktop Feature Parity

**Current state**: Desktop sidebar shows all nav groups (Core, Business, Advanced, System). Mobile bottom nav only shows Home, Tasks, CRM, Finance + "More" hamburger. The "More" button opens the same full sidebar — so all features ARE accessible on mobile via the drawer. The issue is likely about the desktop layout not showing features that are visible on mobile pages, or vice versa.

**Changes**:
- **AppLayout.tsx**: Ensure all nav items visible on mobile drawer are also visible on desktop sidebar (they already are). The real parity issue is likely that mobile bottom nav has quick access to 4 items while desktop has all items always visible — this is fine by design.
- If the user means specific page layouts differ between mobile/desktop (e.g., some components hidden on desktop via `md:hidden`), audit all pages for `hidden md:block` or `md:hidden` classes that might hide features on one breakpoint. Ensure no functional elements are mobile-only.

---

## Technical Details

### Database Migration
```sql
-- Add salary to team_members
ALTER TABLE public.team_members ADD COLUMN salary numeric DEFAULT 0;

-- Add gst_number to businesses
ALTER TABLE public.businesses ADD COLUMN gst_number text;
```

### Files to modify
- **New migration**: `salary` + `gst_number` columns
- **`src/hooks/useSupabaseData.ts`**: Add `useUpdateTeamMember` hook
- **`src/pages/Settings.tsx`**: Rebuild Team tab with full form, add GST field to Workspace tab, add role permissions info
- **`src/components/layout/AppLayout.tsx`**: Audit and ensure feature parity (add more items to bottom nav or ensure drawer covers all)

### Files to audit for mobile-only features
- All page files for `md:hidden` / `hidden md:` patterns that might create asymmetry

