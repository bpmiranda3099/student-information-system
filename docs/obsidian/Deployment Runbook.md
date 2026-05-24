# Deployment Runbook

## Prerequisites

- Supabase project (Postgres + Storage bucket `lesson-pdfs`)
- Google AI Studio API key (Gemini)
- Resend API key
- GitHub repo
- Vercel account
- Render account

## Local Development

```bash
docker compose up -d
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm install
pnpm --filter @sis/shared build
pnpm --filter @sis/api db:generate
pnpm --filter @sis/api db:push
pnpm --filter @sis/api db:seed
pnpm dev
```

## Vercel (Frontend)

- Root directory: `apps/web`
- Env: `NEXT_PUBLIC_API_URL=https://your-api.onrender.com`

## Render (API)

- Use `render.yaml` blueprint
- Set env vars: DATABASE_URL, SUPABASE_*, GEMINI_API_KEY, RESEND_API_KEY, CORS_ORIGINS
- Run migrations: `pnpm --filter @sis/api exec prisma migrate deploy`

## Post-Deploy

1. Verify `GET /health`
2. Test login with seeded accounts
3. Confirm CORS allows Vercel domain
