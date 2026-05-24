#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/web"

echo "==> Vercel setup for Student Information System (apps/web)"
echo "    Repo: https://github.com/bpmiranda3099/student-information-system"
echo

if ! command -v vercel >/dev/null 2>&1; then
  echo "Install Vercel CLI: npm i -g vercel"
  exit 1
fi

if ! vercel whoami >/dev/null 2>&1; then
  echo "Not logged in. Run: vercel login"
  exit 1
fi

echo "==> Link monorepo (creates .vercel/repo.json)"
cd "$ROOT"
vercel link --repo --yes --project student-information-system-web 2>/dev/null || vercel link --repo

echo "==> Pull project settings into apps/web"
cd "$WEB"
vercel pull --yes --environment=production

echo
echo "==> Set production environment variables (update API URL after Render deploy)"
read -r -p "Render API URL [https://sis-api.onrender.com]: " API_URL
API_URL="${API_URL:-https://sis-api.onrender.com}"

vercel env rm NEXT_PUBLIC_API_URL production --yes 2>/dev/null || true
printf '%s' "$API_URL" | vercel env add NEXT_PUBLIC_API_URL production

vercel env rm NEXT_PUBLIC_SUPABASE_URL production --yes 2>/dev/null || true
printf '%s' "https://uzjpuxulgdpgqrynyxvu.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL production

read -r -p "Supabase publishable key: " SUPABASE_KEY
if [[ -n "$SUPABASE_KEY" ]]; then
  vercel env rm NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production --yes 2>/dev/null || true
  printf '%s' "$SUPABASE_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY production
fi

echo "==> Mirror env vars to preview"
printf '%s' "$API_URL" | vercel env add NEXT_PUBLIC_API_URL preview 2>/dev/null || true
printf '%s' "https://uzjpuxulgdpgqrynyxvu.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL preview 2>/dev/null || true
[[ -n "${SUPABASE_KEY:-}" ]] && printf '%s' "$SUPABASE_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY preview 2>/dev/null || true

echo "==> Pull env to apps/web/.env.local"
vercel env pull .env.local --yes --environment=development

echo "==> Deploy preview"
vercel deploy

echo
echo "Done. Production deploy: cd apps/web && vercel --prod"
echo "Dashboard: https://vercel.com/dashboard"
