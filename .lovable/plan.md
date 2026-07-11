## Goal
Publish the six public legal pages Razorpay's merchant onboarding requires, wired into the site so their reviewer can click every link from the homepage. Content reflects the confirmed business facts.

## Confirmed facts (from the user)
- **Entity**: Proprietorship trading as **Disha** (owner details on file).
- **Contact**: `shrirajglobal@gmail.com` — used for support, grievance officer, and billing queries.
- **Refund**: **No refunds** once payment is made. Users may cancel any time to stop future renewals; unused period is not refunded.
- **Scope**: Only Growth ₹999/mo and Scale ₹4,999/mo recurring subscriptions run through Razorpay. No physical goods, no one-time add-ons.

## Pages to add (all public, no auth)

| Route | Purpose (Razorpay checklist) |
|---|---|
| `/terms` | Terms & Conditions |
| `/privacy` | Privacy Policy (IT Rules 2011 + DPDP Act 2023 aligned) |
| `/refund` | Cancellation & Refund Policy (**no refunds; cancel anytime to stop renewals**) |
| `/shipping` | Shipping & Delivery Policy (digital service, access provisioned instantly on payment) |
| `/contact` | Contact Us (support email, grievance officer, business address placeholder) |
| `/pricing` | Public pricing page mirroring the Landing pricing block, so Razorpay reviewers see a dedicated URL |

Every page will include: entity name, jurisdiction (India — courts of the registered state), last-updated date, and a link back to Home.

## Wiring
- Add routes in `src/App.tsx` inside the unauthenticated route group **and** the authenticated group so links work whether or not the user is signed in.
- Add a **legal links row** to the Landing footer (`src/pages/Landing.tsx`): Terms · Privacy · Refund · Shipping · Contact · Pricing.
- Add the same row to `src/components/layout/AppLayout.tsx` footer area (small, muted) so signed-in pages also expose them.
- No changes to database, auth, pricing config, or Razorpay code — this task is legal surface only.

## Content approach
- One shared `LegalPage` layout component (`src/components/legal/LegalPage.tsx`) — narrow container, `prose`-style typography using existing tokens (IBM Plex Sans, forest green accents), "Last updated" line, back-to-home link. Reuses existing design tokens; no bolt-on trust-center styling.
- Each page is a plain React component rendering static, review-safe copy. No `dangerouslySetInnerHTML`.
- Copy written for a **Proprietorship** offering a **B2B SaaS subscription in India**. Neutral and factual — no compliance/certification claims (no SOC2, no "bank-grade", no "end-to-end encryption", no GDPR promises). Bracketed placeholders `[Proprietor legal name]`, `[Registered address]`, `[GSTIN — if registered]` appear once per page for a fast find-and-replace pass.

## Page outlines

**Terms & Conditions** — acceptance, eligibility (18+, authorised business rep), account & security, subscription (Growth/Scale, ₹, GST extra, auto-renew, cancel anytime), acceptable use, IP ownership, third-party services (Lovable Cloud infra, Razorpay for payments, AI providers for the specific features), disclaimers "as is", liability capped at fees paid in the prior 3 months, indemnity, termination, governing law = India, jurisdiction = courts of registered state, changes to terms, contact.

**Privacy Policy** — data collected (account, business, usage, cookies, payment metadata via Razorpay — full card details never touch our servers), purposes, legal basis, sharing (payment processor, cloud infra, AI providers), retention (active + 90 days after account deletion unless law requires longer), user rights (access, correction, deletion, grievance), children (not for under-18), security controls actually operated (auth, RLS, HTTPS), grievance officer block, changes, contact.

**Refund & Cancellation** — key line: *"All payments made to Disha are final and non-refundable."* Subscriptions renew automatically on the billing date until cancelled. Users can cancel any time from **Settings → Billing**; cancellation stops the next renewal and access continues until the end of the paid period. No pro-rata refund for the unused portion. No refund for accounts terminated due to breach of the Terms. Duplicate/failed transactions incorrectly captured by Razorpay will be reversed on written request to `shrirajglobal@gmail.com` within 7–10 business days.

**Shipping & Delivery** — Disha is a digital SaaS; no physical shipment. Access to paid features is provisioned within a few minutes of successful payment confirmation from Razorpay. Support channel and expected response window (2 business days).

**Contact Us** — support email, business hours, registered address, grievance officer (name placeholder + `shrirajglobal@gmail.com`) with the acknowledgement/resolution timelines mandated by IT Rules 2021 (acknowledge within 24 hours, resolve within 15 days).

**Pricing** — clean two-tier table (Starter Free, Growth ₹999/mo, Scale ₹4,999/mo), "all prices exclusive of 18% GST", trial terms, per-tier feature list pulled from `pricing.ts` (single source of truth), FAQ (billing cycle, cancel, GST invoice, **non-refundable** note).

## Files touched
- `src/App.tsx` — 6 new routes in both route groups.
- `src/pages/Landing.tsx` — footer legal links row.
- `src/components/layout/AppLayout.tsx` — small footer legal links row.
- `src/components/legal/LegalPage.tsx` — new shared layout.
- `src/pages/legal/Terms.tsx`, `Privacy.tsx`, `Refund.tsx`, `Shipping.tsx`, `ContactUs.tsx`, `Pricing.tsx` — new.

## What I will not do
- Not enable Razorpay checkout code, webhooks, or product setup in this task — this ships the legal surface Razorpay's reviewer needs before activation.
- Not claim any certification, audit, encryption strength, or regulatory compliance we haven't verified.
- Not touch DB schema, RLS, pricing config, or auth.

## Fill-ins you'll need after I ship
1. Proprietor's full legal name.
2. Registered business address (with PIN code).
3. GSTIN — if registered; otherwise I'll write "not GST-registered".
4. Grievance Officer name (can be the proprietor).
