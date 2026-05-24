# Student Information System

College student information system with enrollment, flexible grading, attendance, faculty syllabus/lesson management, and AI-powered lesson tailoring.

## Stack

| Layer | Technology | Deployment |
|-------|------------|------------|
| Frontend | Next.js 15, Tailwind v4, shadcn/ui | Vercel |
| Backend | Express, Helmet, JWT | Render |
| Database | Supabase Postgres (Prisma) | Supabase |
| Storage | Supabase Storage | Supabase |
| AI | Google Gemini 3.5 Flash (`@google/genai`) | — |
| Email | Resend (custom HTML) | — |

## Monorepo Structure

```
apps/web          Next.js frontend
apps/api          Express API
packages/shared   Zod schemas, grade computation engine
packages/eslint-config
packages/tsconfig
docs/obsidian     Dev memory vault (Obsidian)
e2e               Playwright smoke tests
```

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (for local Postgres)

### Setup

> **Note:** Build scripts (Prisma, esbuild, etc.) are pre-approved in [`.npmrc`](.npmrc). You do **not** need to run `pnpm approve-builds` interactively.

```bash
# Start local Postgres
docker compose up -d

# Install dependencies
pnpm install

# Configure environment
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# Build shared package and set up database
pnpm --filter @sis/shared build
pnpm --filter @sis/api db:generate
pnpm --filter @sis/api db:push
pnpm --filter @sis/api db:seed

# Start dev servers (API :4000, Web :3000)
pnpm dev
```

### Demo Accounts

Password for all: `Password123!`

| Role | Email |
|------|-------|
| Admin | admin@sis.edu |
| Faculty | faculty@sis.edu |
| Student | student@sis.edu |

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all packages |
| `pnpm test` | Run unit tests |
| `pnpm test:integration` | Run API integration tests |
| `pnpm test:e2e` | Run Playwright smoke tests |
| `pnpm lint` | Lint all packages |

## Grade Computation

Faculty configure per-section weights and component counts. The shared engine in `packages/shared` computes:

1. Category averages (quiz, seatwork, activity, project, exam)
2. Weighted subtotal (weights sum to 100%)
3. Extracurricular bonus (capped)
4. Final score and letter grade

## API Boundary

The frontend never accesses Supabase directly. All data flows through the Express API with shared Zod schemas for request/response validation.

## Deployment

- **Frontend**: Deploy `apps/web` to Vercel with `NEXT_PUBLIC_API_URL`
- **Backend**: Deploy `apps/api` to Render using `render.yaml`
- **Database**: Run `pnpm --filter @sis/api exec prisma migrate deploy` against Supabase

See [docs/obsidian/Deployment Runbook.md](docs/obsidian/Deployment%20Runbook.md) for full instructions.

## Testing

- **Unit**: Jest in `packages/shared` (grade engine)
- **Integration**: Jest + Supertest in `apps/api`
- **E2e**: Playwright in `e2e/tests`

## Environment Variables

See `apps/api/.env.example` and `apps/web/.env.example`.
