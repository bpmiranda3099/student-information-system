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

### Option A — Blueprint (recommended)

1. Open [Create Blueprint](https://dashboard.render.com/blueprint/new?repo=https://github.com/bpmiranda3099/student-information-system)
2. Review `render.yaml` (service: `sis-api`)
3. Set secret env vars when prompted:

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Supabase Postgres connection string |
| `SUPABASE_URL` | `https://uzjpuxulgdpgqrynyxvu.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `GEMINI_API_KEY` | Google AI Studio key |
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | e.g. `SIS <onboarding@resend.dev>` |
| `CORS_ORIGINS` | Your Vercel URL (comma-separated) |

4. Deploy. Migrations run via `preDeployCommand` on each deploy.

### Option B — CLI helper

```bash
chmod +x scripts/render-setup.sh
./scripts/render-setup.sh
```

### Render agent skills (Cursor)

Installed via:

```bash
render skills install --tool cursor --skill render-deploy --skill render-debug --skill render-monitor
```

Skills live in `~/.cursor/skills/render-*`. Example prompts: *Deploy my application to Render*, *Debug my Render deployment*, *Is my Render service healthy?*

### Render MCP (Cursor)

1. Create an API key at [Render Account Settings](https://dashboard.render.com/u/settings#api-keys)
2. Add to `~/.cursor/mcp.json`:

```json
"render": {
  "url": "https://mcp.render.com/mcp",
  "headers": {
    "Authorization": "Bearer YOUR_RENDER_API_KEY"
  }
}
```

3. Restart Cursor and prompt: `Set my Render workspace to [your workspace]`

## Post-Deploy

1. Verify `GET /health`
2. Test login with seeded accounts
3. Confirm CORS allows Vercel domain
