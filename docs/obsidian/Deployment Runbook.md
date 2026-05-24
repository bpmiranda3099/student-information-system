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

### Option A — GitHub import (recommended first time)

1. Open [Import Git Repository](https://vercel.com/new/import?s=https://github.com/bpmiranda3099/student-information-system)
2. **Root Directory:** `apps/web`
3. **Framework:** Next.js (auto-detected)
4. **Build Command:** `cd ../.. && pnpm exec turbo run build --filter=@sis/web` (from `vercel.json`)
5. **Install Command:** `cd ../.. && pnpm install --frozen-lockfile`
6. Add environment variables:

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `https://sis-api.onrender.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://uzjpuxulgdpgqrynyxvu.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your Supabase publishable key |

7. Deploy. Vercel auto-deploys on every push to `main`.

### Option B — Vercel CLI (after `vercel login`)

```bash
chmod +x scripts/vercel-setup.sh
./scripts/vercel-setup.sh
```

Uses `vercel link --repo` per the Vercel monorepo plugin guidance.

## Render (API)

- Use `render.yaml` blueprint
- Set env vars: DATABASE_URL, SUPABASE_*, GEMINI_API_KEY, RESEND_API_KEY, CORS_ORIGINS
- Run migrations: `pnpm --filter @sis/api exec prisma migrate deploy`

## Post-Deploy

1. Verify `GET /health`
2. Test login with seeded accounts
3. Confirm CORS allows Vercel domain
