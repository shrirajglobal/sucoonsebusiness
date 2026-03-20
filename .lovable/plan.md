

# Fix CRM Bugs: Validation, Assigned To, and Date Formatting

## Issues Found

1. **No input validation** — Phone accepts anything, email accepts anything, no length limits
2. **Assigned To missing owner** — The owner IS included (line 146), but team members without `user_id` are filtered out correctly. The screenshot shows "nave" returning "No results found" — this means the team member named "Nave" either doesn't have a `user_id` or the search doesn't match. The `CommandItem` uses `value={option.label}` for search, so searching "nave" should match "Nave" (case-insensitive). Need to verify the team member has a valid `user_id`.
3. **Dates shown as raw ISO strings** (e.g., `2026-03-25`) instead of using the business's `date_format` setting (dd/MM/yyyy, MM/dd/yyyy, etc.)
4. **Console warnings** — `forwardRef` warnings on Badge and LeadNotes components

## Plan

### 1. Add Form Validation in `src/pages/CRM.tsx`

Add validation to `handleSave`:
- **Phone**: Allow only digits, spaces, +, -. Min 10 digits. Show toast error if invalid.
- **Email**: Basic email regex check. Show toast error if invalid.
- **Name**: Max 100 chars, required (already checked).
- **Value**: Must be positive number if provided.

### 2. Fix Assigned To to Include Owner

The owner is already included at line 146. The real issue is that team members added without a linked user account (no `user_id`) don't appear. This is correct behavior since `leads.assigned_to` references `auth.users(id)`. However, the owner should always be the first option with the hint "You" or "Owner". Let me verify the current code is working — the owner push at line 146 looks correct. The issue in the screenshot may be that "nave" simply doesn't exist as a team member name. No code change needed here unless the owner is genuinely missing.

**Actually**, re-reading the user's complaint: "Assigned to is now showing all other users except owner." This means team members show up but the owner does NOT. Looking at line 146: `if (user?.id) opts.push(...)` — this should work if `user` is defined. Let me check if `business?.owner_name` might be empty/null, causing the option to show but with no visible label. The fix: ensure the owner option always has a fallback label like "Me (Owner)".

### 3. Create Date Formatting Utility

Create a helper `formatDate(dateStr: string, dateFormat: string)` that converts ISO date strings to the user's chosen format from Settings.

Use it in:
- `CRM.tsx` — kanban cards and list view follow-up dates  
- `LeadDetail.tsx` — created date, follow-up date, timeline dates

### 4. Fix forwardRef Warnings

Minor: Badge component used with `ref` in LeadDetail — not critical but clean it up.

## Files to Change

### `src/lib/utils.ts`
- Add `formatDisplayDate(dateStr: string, dateFormat: string): string` helper

### `src/pages/CRM.tsx`
- Add phone/email validation in `handleSave` with toast errors
- Ensure owner option has robust fallback label ("Me (Owner)")
- Use `formatDisplayDate` for follow-up dates on cards
- Add `maxLength` attributes to inputs

### `src/pages/LeadDetail.tsx`
- Use `formatDisplayDate` for all displayed dates (created, follow-up, timeline)

### No database changes needed

