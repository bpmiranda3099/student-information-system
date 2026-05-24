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
6. Add environment variables (Vercel Supabase integration sets most of these automatically):

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | Your Render API URL, e.g. `https://sis-api-q3ra.onrender.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Auto from Supabase integration |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auto from Supabase integration (web app accepts this or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) |

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
3. Set secret env vars when prompted (copy Postgres vars from Vercel → Settings → Environment Variables):

| Render (API) | Copy from Vercel Supabase integration |
|--------------|----------------------------------------|
| `DATABASE_URL` | `POSTGRES_PRISMA_URL` (best for Prisma) |
| `SUPABASE_URL` | `SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` |
| `GEMINI_API_KEY` | (manual) |
| `RESEND_API_KEY` | (manual) |
| `EMAIL_FROM` | (manual) |
| `CORS_ORIGINS` | Your Vercel production URL |

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

### Option C — CLI deploy

The CLI **cannot apply** `render.yaml` as a Blueprint (only validates it). Use CLI to **create** the service or **trigger redeploys** after it exists.

```bash
render login
render workspace set <your-workspace-id>   # if needed
chmod +x scripts/render-deploy-cli.sh
./scripts/render-deploy-cli.sh             # reads apps/api/.env
```

Manual commands:

```bash
# List services
render services -o json

# Trigger deploy (after service exists)
render deploys create srv-XXXX --wait

# Stream logs
render logs srv-XXXX
```

Auto-deploy also runs on every push to `main` once the GitHub repo is connected in Render.

## Supabase GitHub Integration

This repo uses **Prisma** for schema and migrations (`apps/api/prisma/`). The Express API applies them on Render via `prisma migrate deploy` in `render.yaml`. Supabase is the **hosted Postgres + Storage** provider, not the migration source of truth.

### Working directory (Supabase dashboard)

When connecting this GitHub repo in Supabase → **Project Settings → Integrations → GitHub**, set:

| Field | Value |
|-------|--------|
| **Working directory** | `.` |

`supabase/` does not exist in this repo yet and is **not required** for the current architecture. If you add it later, place it at the repository root (not under `apps/web` or `apps/api`).

### What to use instead of Supabase migrations

| Concern | Tool |
|---------|------|
| Schema changes | Edit `apps/api/prisma/schema.prisma`, run `pnpm --filter @sis/api db:migrate`, commit `prisma/migrations/` |
| Production deploy | Render `preDeployCommand`: `pnpm --filter @sis/api exec prisma migrate deploy` |
| Web env vars | Vercel **Supabase integration** (already connected) |
| API database URL | Render `DATABASE_URL` = Supabase session pooler / Prisma URL (same value as Vercel `POSTGRES_PRISMA_URL`) |

### Do **not** run (unless you migrate off Prisma)

```bash
supabase init
supabase db pull --db-url ...
git add supabase && git commit -m "Initial migration"
```

`supabase db pull` creates SQL migrations in `supabase/migrations/` that **conflict** with Prisma. Enabling **Deploy to production** in the Supabase GitHub integration would try to apply those migrations alongside Prisma and can break the database.

### When Supabase GitHub integration *would* make sense

Enable it only if you adopt Supabase-native workflows:

- Edge Functions in `supabase/functions/`
- Declarative Storage buckets in `supabase/config.toml`
- Preview branches that run **Supabase** migrations (replacing Prisma)

Until then, skip the Supabase GitHub integration or connect the repo **without** “Deploy to production” and **without** a `supabase/migrations/` folder.

### Optional: preview-branch failure check

If you later add `supabase/` and enable preview branches, you can require the Supabase check on PRs (see Supabase docs for `.github/workflows/notify-failure.yaml`).

## Post-Deploy

1. Verify `GET /health`
2. Test login with seeded accounts
3. Confirm CORS allows Vercel domain
