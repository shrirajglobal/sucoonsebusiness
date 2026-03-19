

# Fix AI Task Creator & Task Creation Bugs

## Issues Found

### Bug 1: AI Task not using parsed data
The `ai-assistant` edge function returns `{"reply": "{...json...}"}` but `AITaskCreator.tsx` checks `data?.content` and `data?.choices?.[0]?.message?.content`, missing the `reply` key. Falls back to `JSON.stringify(data)`, regex matches the outer wrapper object instead of the inner parsed JSON. Result: raw prompt saved as title, parsed due_date/description ignored.

**Fix**: Add `data?.reply` to the parsing chain in `AITaskCreator.tsx`. Parse the `reply` string as JSON first since it contains the structured task data.

### Bug 2: "invalid input syntax for type uuid: 'none'"
The "Link to Lead" dropdown uses `<SelectItem value="none">None</SelectItem>`. When selected, `linkedLeadId` becomes `"none"` (a truthy string), so `linkedLeadId || null` passes `"none"` to the database as `linked_lead_id`, which is a UUID column.

**Fix**: In `handleSave`, change the null-coalescing for `linkedLeadId` to explicitly check for `'none'` and empty string. Same fix needed for `assignedTo` dropdown which likely has the same pattern.

## Implementation

### File: `src/components/tasks/AITaskCreator.tsx`
- Replace the response parsing line to handle `data?.reply` format
- Parse `data.reply` as JSON string first, then extract fields
- Keep fallback chain for robustness

### File: `src/pages/Tasks.tsx`
- In `handleSave`: change `linkedLeadId || null` to `(linkedLeadId && linkedLeadId !== 'none') ? linkedLeadId : null`
- Same pattern for `assignedTo` if it uses a similar "none" sentinel value
- In `resetForm`: set `linkedLeadId` to `'none'` instead of empty string for consistency with Select default

