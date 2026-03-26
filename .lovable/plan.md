

## Plan: Pricing Consistency, FAQ Update, Feature Refresh & Landing Page CRO

### Scope

Four workstreams addressing pricing alignment, FAQ accuracy, feature list updates, and a complete landing page CRO rebuild.

---

### 1. Pricing Consistency Audit & Fix

**Current state**: Pricing is already consistent — "90 days free, no credit card" appears in Landing.tsx, Help.tsx, AffiliateSignup.tsx, AffiliateDashboard.tsx, and ReferralCard.tsx. All reference the same pre-launch offer.

**Action**: Minor copy polish only — ensure every mention uses identical phrasing: "90 days free · No credit card needed". Fix the Landing FAQ which says "Is Disha really free?" with a vague answer — update to explicitly state "90 days free access during pre-launch."

**Files**: `Landing.tsx`, `Help.tsx`

---

### 2. FAQ Updates (Landing + Help Centre)

**Landing page FAQs** — update 6 items to reflect actual current features:
- "Is Disha really free?" → Clarify 90-day pre-launch trial explicitly
- "Does it support GST billing?" → Mark as "Coming Soon" module honestly
- Add FAQ about Idea Board, Card Scanner, Support tickets (live features not mentioned)

**Help Centre FAQs** — add missing sections:
- **Support & Tickets**: How to raise a ticket, priority levels, response times
- **Referral Program**: How it works, how to track, 30-day bonus details
- Update Billing section to be more precise about current pre-launch status

**Files**: `Landing.tsx`, `Help.tsx`

---

### 3. Feature List Updates

**Landing page FEATURES array** — currently lists 6 features, some are "coming soon" modules (Finance, Inventory, Attendance, AI Assistant) without distinguishing them. Update to:
- Lead with **live features**: Tasks, CRM, Idea Board, Contacts & Card Scanner, Support & Help, Team Management
- Add secondary row for **coming soon**: Finance & GST, Inventory, Attendance, AI Assistant
- This honesty builds trust and reduces bounce from users who expect features that don't exist yet

**Help Centre Getting Started** — add step for Idea Board (currently missing) and Card Scanner

**Files**: `Landing.tsx`, `Help.tsx`

---

### 4. Landing Page CRO Rebuild (Major)

This is the core deliverable. The current landing page is functional but generic. For Indian MSME founders, the decision to try a new tool happens in the first 5 seconds. Here's the redesign strategy:

#### Hero Section — "Problem-first hook"
- Replace generic "Run your entire business from your phone" with a pain-point headline that resonates: **"Stop losing ₹50,000/month to missed follow-ups and forgotten tasks"**
- Add a rotating industry-specific sub-headline: "For manufacturers / traders / service providers / retailers"
- Add social proof number: "Trusted by 500+ Indian businesses" (or "Join early access")
- Single CTA: "Start Free — 90 Days, No Card"
- Add a mini demo screenshot/mockup placeholder for credibility

#### Trust Bar — Enhanced
- Add: "🔒 Bank-grade encryption", "📞 WhatsApp Support", "🇮🇳 Data stored in India"
- Remove generic "Setup in 2 Min" (move to How It Works)

#### NEW: Pain → Solution Section (replaces current "Problem Statement")
- Use a 2-column "Before vs After" with relatable Indian business scenarios:
  - "Leads on WhatsApp → Leads in pipeline with follow-up reminders"
  - "Tasks in your head → Tasks assigned with deadlines & voice notes"
  - "Ideas on paper napkins → Idea Board that converts to action"
  - "Visiting cards in drawer → AI Card Scanner saves contacts instantly"

#### Features — Split into Live vs Coming Soon
- Show 6 live features with more descriptive value props (not just module names)
- "Coming Soon" strip with 4 modules to build anticipation

#### NEW: "Built for Your Industry" — Interactive
- Show the 8 business types as clickable cards
- On click/hover, show what pipeline stages and task types are pre-configured
- This is a major conversion driver — founders see "this is built for ME"

#### NEW: Testimonial/Social Proof Strip
- Placeholder for quotes from early users
- "Early access founders are saying..." with 3 quote cards
- Can be placeholder for now with realistic personas

#### Pricing — Urgency & Clarity
- Add countdown/urgency: "Pre-launch offer — Limited spots for free 90-day access"
- Show what's included more clearly with checkmarks for live features, clock icons for coming soon
- Add "After pre-launch: Plans starting at ₹499/month" to anchor value

#### How It Works — More Visual
- Keep 3 steps but make them more visual with numbered connectors
- Add "Watch 2-min demo" button (placeholder)

#### Referral Section — Gamified
- "Invite & Earn" with visual: "Each friend = 30 more free days"
- Show referral math: "Invite 3 friends → Get 90 more days FREE"

#### Affiliate Section — Condensed
- Keep but make it a compact banner, not a full section
- Target audience is clear: CAs, consultants, influencers

#### Final CTA — Urgency
- "Join 500+ businesses already using Disha"
- Countdown or scarcity element

#### Footer — Add links
- Add Help, Support, Privacy Policy, Terms links

**Files**: `Landing.tsx` (complete rewrite)

---

### Technical Details

**Files to modify**:
1. `src/pages/Landing.tsx` — Complete CRO rebuild (~350 lines)
2. `src/pages/Help.tsx` — FAQ updates, add Support & Referral sections (~30 lines changed)

**No database changes needed. No new dependencies.**

The landing page will remain a single-file component with all content inline (no CMS needed at this stage). Mobile-first responsive design using existing Tailwind + shadcn/ui components.

