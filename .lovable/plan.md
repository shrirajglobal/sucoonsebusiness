

# Rebrand from "Sucoon Se Business" to "Disha"

Update all branding assets, text references, and metadata across the entire app.

## Changes Required

### 1. Assets — Favicon & Logo
- Copy `user-uploads://Fevicon.png` → `public/favicon.png` (favicon)
- Copy `user-uploads://Main_Logo.png` → `src/assets/disha-logo.png` (main logo for Landing, sidebar, etc.)
- Update `index.html` favicon link to point to `/favicon.png`

### 2. `index.html` — Title & Meta Tags
- Title: "Sucoon Se Business" → "Disha"
- Description: Update to "Disha — Direction for your business. A simple automation platform for Indian MSMEs."
- OG/Twitter title and description: same updates
- OG image: keep existing (can be updated later with new branded screenshot)

### 3. `vite.config.ts` — PWA Manifest
- `name`: "Disha — Direction for your business"
- `short_name`: "Disha"
- `description`: update
- `theme_color`: keep `#2d7a5f` (matches existing green brand)

### 4. `src/pages/Landing.tsx` — All visible text
- Navbar logo: replace Building2 icon with `<img>` using the logo asset
- Navbar brand text: "Sucoon Se" → "Disha"
- FAQ text: "Is Sucoon Se really free?" → "Is Disha really free?", all "Sucoon Se" → "Disha"
- Problem section: "Sucoon Se brings everything" → "Disha brings everything"
- Footer brand: "Sucoon Se Business" → "Disha"
- Footer copyright: "© 2026 Sucoon Se" → "© 2026 Disha"
- Tagline opportunity: add "Direction for your business" as subtitle

### 5. `src/components/layout/AppLayout.tsx` — Sidebar & Header
- Default business name fallback: "Sucoon Se" → "Disha"
- Version text: "Sucoon Se Business v2.0" → "Disha v2.0"
- Mobile header text: "Sucoon Se Business" → "Disha"
- Sidebar logo: replace Building2 icon fallback with the Disha logo image

### 6. `src/pages/Login.tsx`
- "Sign in to Sucoon Se Business" → "Sign in to Disha"

### 7. `src/pages/Signup.tsx`
- "Get started with Sucoon Se Business" → "Get started with Disha"

### 8. `supabase/functions/ai-assistant/index.ts`
- System prompt: "Sucoon Se" → "Disha"

### Files Summary
| File | Change |
|------|--------|
| `public/favicon.png` | New — copied from upload |
| `src/assets/disha-logo.png` | New — copied from upload |
| `index.html` | Title, meta, favicon link |
| `vite.config.ts` | PWA manifest name/short_name |
| `src/pages/Landing.tsx` | All "Sucoon Se" → "Disha", logo image |
| `src/components/layout/AppLayout.tsx` | Fallback name, version, header, logo |
| `src/pages/Login.tsx` | Sign-in text |
| `src/pages/Signup.tsx` | Sign-up text |
| `supabase/functions/ai-assistant/index.ts` | AI system prompt |

