

# Use Horizontal Disha Logo in Sidebar & Mobile Header

## Current State
The sidebar header (lines 73-86) shows a small 36×36px square logo + text "Disha" separately. The uploaded horizontal logo already includes the Disha name with tagline — using it directly will look much more professional and avoid redundant text.

## Plan

### `src/assets/disha-horizontal.png`
- Copy the uploaded `Horizontal.png` as the new horizontal logo asset

### `src/components/layout/AppLayout.tsx`

**Sidebar header (desktop)** — Replace the current icon+text layout with the horizontal logo:
- Remove the 36×36 logo box + separate business name/owner text
- Show the horizontal logo as a single `<img>` spanning the full sidebar width (~220px usable), height ~40px, `object-contain` with left alignment
- If `business.logo_url` exists (custom business logo), keep showing that with the business name text fallback
- Below the logo, show owner name in small muted text only (no duplicate "Disha" text)

**Mobile header** — Replace the text "Disha" with the horizontal logo image:
- `<img>` with height ~28px, `object-contain`, replacing the `<span>` text

### Sizing for CRO
- Desktop sidebar: logo height 38-40px with proper padding (p-5) — crisp at 2x resolution since source image is large
- Mobile header: logo height 28px to fit the 56px header bar
- Both use `object-contain` + `object-left` so the logo scales without distortion

### Files
| File | Change |
|------|--------|
| `src/assets/disha-horizontal.png` | New — copy from upload |
| `src/components/layout/AppLayout.tsx` | Replace sidebar header & mobile header with horizontal logo |

