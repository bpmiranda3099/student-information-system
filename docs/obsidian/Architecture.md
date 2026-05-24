# SIS Architecture

Dev memory vault for the Student Information System.

## Links

- [[Grade Computation Formula]]
- [[API Route Map]]
- [[Deployment Runbook]]
- [[Database Schema]]

## Stack

- **Frontend**: Next.js 15, Tailwind v4, shadcn/ui → Vercel
- **Backend**: Express, Helmet, JWT → Render
- **Database**: Supabase Postgres via Prisma
- **Storage**: Supabase Storage (lesson PDFs)
- **AI**: Google Gemini API
- **Email**: Resend (custom HTML templates)

## Monorepo

```
apps/web     → Next.js frontend
apps/api     → Express API
packages/shared → Zod schemas, grade engine
```

## Auth Flow

1. `POST /auth/login` → httpOnly JWT cookies
2. Frontend calls `GET /auth/me` with credentials
3. Refresh via `POST /auth/refresh`

## Enforced API Boundary

Frontend never touches Supabase directly. All requests go through `apps/api` with shared Zod validation in `packages/shared`.
