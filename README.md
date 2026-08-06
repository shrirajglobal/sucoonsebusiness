# Suvee — All-in-One Business Management for Indian SMBs

Suvee is a comprehensive business management platform built for Indian startups, MSMEs, and small businesses. It provides task management, CRM, customer engagement tracking, attendance, inventory, finance, compliance, and more — all in one app.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Lovable Cloud (Supabase) — PostgreSQL with RLS, Edge Functions, Auth, Storage
- **AI**: Lovable AI Gateway (Gemini) for voice transcription, report generation, and assistant
- **State**: Zustand + TanStack Query

## Key Modules

| Module | Description |
|--------|-------------|
| Tasks | Task management with subtasks, time tracking, Gantt view, AI task creation |
| CRM | Lead pipeline with notes, follow-ups, card scanner |
| Engagement | Customer tier management, contact logging, coverage heatmap |
| Attendance | Punch in/out, shift management, leave requests |
| Finance | Income/expense tracking with GST support |
| Inventory | Stock management with SKU, branches, purchase orders |
| Forms | Custom form builder with response collection |
| Idea Board | Collaborative idea management with voting |
| Compliance | Regulatory event tracking |
| Analytics | AI-generated weekly health reports |

## Architecture

- **Auth**: Email/password with email verification. Role-based access (owner > admin > manager > executive > field_staff).
- **Data isolation**: All business data is scoped via `business_id` and enforced through PostgreSQL RLS policies.
- **Edge Functions**: JWT-validated serverless functions for AI processing and affiliate tracking.
- **Storage**: Private buckets for card scans, voice notes, and logos — scoped by business.

## Security

- Row-Level Security on all tables
- JWT validation on all edge functions
- Role-based access control via `user_roles` table
- Private storage buckets with business-scoped access
- Input validation on all API endpoints

## Development

```bash
npm install
npm run dev
```

## License

Proprietary — All rights reserved.
