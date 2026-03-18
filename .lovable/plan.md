

# Round 1 Implementation Plan

## What We're Building

### 1. Landing Page (`src/pages/Landing.tsx`)
A mobile-first, high-converting landing page for Indian MSMEs with these sections:

- **Navbar**: Logo + Login + "Start Free" CTA (sticky on mobile)
- **Hero**: "Run your entire business from your phone" — large CTA, trust indicators
- **Trust bar**: "GST Ready · WhatsApp · UPI · ₹ INR · Made for India"
- **Problem statement**: "Still juggling WhatsApp + Excel + Paper?"
- **Features grid**: 6 cards — Tasks, CRM, Finance, Inventory, Attendance, AI Assistant
- **How it works**: 3-step visual (Sign up → Setup in 2 min → Start managing)
- **Business types**: Show the 8 pre-configured industry types from `BUSINESS_TYPES`
- **Pricing**: "Free to start. No credit card."
- **FAQ**: Accordion with 5-6 common questions
- **Final CTA**: Repeated signup push
- **Footer**: Links + copyright

Design: Forest green primary, IBM Plex Sans, large touch targets (min 44px), mobile-first responsive.

### 2. Routing Update (`src/App.tsx`)
- Unauthenticated users see `Landing` at `/` instead of redirecting to `/login`
- `/login` and `/signup` remain accessible
- Authenticated users bypass landing and go to Dashboard

### 3. Mobile Bottom Navigation (`src/components/layout/AppLayout.tsx`)
- Add a fixed bottom nav bar (visible only on mobile, `md:hidden`)
- 5 tabs: Dashboard, Tasks, CRM, Finance, More (opens the existing sheet sidebar)
- Replace the hamburger-only approach — bottom nav is the primary mobile navigation
- Keep the existing sidebar for desktop unchanged
- Grouped sidebar sections with small headers: **Core** (Dashboard, Tasks, CRM, Attendance), **Business** (Finance, Inventory, Vendors, Compliance), **Advanced** (Analytics, Reports, AI Assistant, Branches), **System** (Settings)

### 4. Phase 4 Modules in Onboarding (`src/lib/constants.ts` + `src/pages/Onboarding.tsx`)
- Add to `ALL_MODULES`: Finance (💰), Inventory (📦), Vendors & PO (🚚), Compliance (📅), AI Assistant (🤖), Branches (🏢)
- Update `DEFAULT_MODULES` to include finance
- In onboarding step 4, show modules grouped: "Core Modules" and "Advanced Modules"

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/Landing.tsx` | **Create** — full landing page |
| `src/App.tsx` | **Modify** — add Landing route for unauthenticated `/` |
| `src/components/layout/AppLayout.tsx` | **Modify** — add mobile bottom nav bar, group sidebar items |
| `src/lib/constants.ts` | **Modify** — add Phase 4 modules to ALL_MODULES |
| `src/pages/Onboarding.tsx` | **Modify** — group modules into Core/Advanced sections |
| `src/index.css` | **Modify** — add bottom nav safe area padding |

## Technical Details

- Landing page uses only existing shadcn components (Card, Button, Accordion, Badge)
- Bottom nav uses `fixed bottom-0` with `pb-[env(safe-area-inset-bottom)]` for iOS
- Main content area gets `pb-16 md:pb-0` to account for bottom nav
- Bottom nav "More" button triggers the existing Sheet sidebar
- Landing page images: use emoji/icons instead of external images for zero-dependency approach
- All responsive breakpoints use existing Tailwind `md:` prefix (768px)

