## Fix: Remove horizontal scroll on Tasks filter chips

The quick-filter chip row on `/tasks` currently scrolls sideways on mobile, hiding buttons off-screen. Change it to wrap onto multiple lines so every button is visible without scrolling right.

### Change
**File:** `src/pages/Tasks.tsx` (line 717)

Replace the chip container class:
- From: `flex gap-2 overflow-x-auto pb-1 scrollbar-none`
- To: `flex flex-wrap gap-2 pb-1`

Result: filter chips (Overdue, Today, Money tasks, By me, priority chips) wrap to a second/third row as needed. Users scroll the page vertically only — never sideways to reach a button.

### Audit
Confirm this is the only horizontal-scroll button strip on Tasks (`rg` shows just one match). No other pages touched.