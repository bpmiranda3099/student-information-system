#!/usr/bin/env bash
# Deploy sis-api to Render via CLI (create service or trigger redeploy).
# Requires: render login (or RENDER_API_KEY), secrets in apps/api/.env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/apps/api/.env"
REPO="https://github.com/bpmiranda3099/student-information-system"
SERVICE_NAME="sis-api"
DEFAULT_EMAIL_FROM='SIS <onboarding@resend.dev>'

BUILD_CMD='pnpm install --frozen-lockfile && pnpm --filter @sis/api db:generate && pnpm exec turbo run build --filter=@sis/api'
PRE_DEPLOY='pnpm --filter @sis/api exec prisma migrate deploy'
START_CMD='node apps/api/dist/index.js'

require_render() {
  if ! command -v render >/dev/null 2>&1; then
    echo "Install Render CLI: brew install render"
    exit 1
  fi
  if ! render whoami -o json >/dev/null 2>&1; then
    echo "Not authenticated. Run: render login"
    echo "Or: export RENDER_API_KEY=rnd_xxxxx"
    exit 1
  fi
}

# Avoid `source .env` — values like EMAIL_FROM=SIS <foo@bar.com> break bash.
load_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Missing ${ENV_FILE}. Copy from apps/api/.env.example and fill in values."
    exit 1
  fi

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%$'\r'}"
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      key="${BASH_REMATCH[1]}"
      val="${BASH_REMATCH[2]}"
      if [[ "$val" =~ ^\"(.*)\"$ ]]; then
        val="${BASH_REMATCH[1]}"
      elif [[ "$val" =~ ^\'(.*)\'$ ]]; then
        val="${BASH_REMATCH[1]}"
      fi
      export "$key=$val"
    fi
  done < "$ENV_FILE"
}

ensure_workspace() {
  if render workspace current -o json >/dev/null 2>&1; then
    return 0
  fi

  local workspace_id
  workspace_id="$(render workspaces -o json | python3 -c "
import json, sys
workspaces = json.load(sys.stdin)
if workspaces:
    print(workspaces[0]['id'])
")"

  if [[ -z "$workspace_id" ]]; then
    echo "No Render workspace found. Run: render login"
    exit 1
  fi

  echo "==> Setting active workspace: ${workspace_id}"
  render workspace set "$workspace_id" --confirm
}

find_service_id() {
  render services -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
items = data if isinstance(data, list) else data.get('services', data.get('items', []))
for item in items:
    svc = item.get('service', item)
    if svc.get('name') == '${SERVICE_NAME}':
        print(svc.get('id', ''))
        break
" 2>/dev/null || true
}

create_service() {
  echo "==> Creating web service '${SERVICE_NAME}' from ${REPO}"
  load_env

  local email_from="${EMAIL_FROM:-$DEFAULT_EMAIL_FROM}"
  if [[ -z "${EMAIL_FROM:-}" ]]; then
    echo "==> EMAIL_FROM not in .env; using default: ${email_from}"
  fi

  render services create \
    --name "$SERVICE_NAME" \
    --type web_service \
    --runtime node \
    --plan free \
    --repo "$REPO" \
    --branch main \
    --root-directory . \
    --build-command "$BUILD_CMD" \
    --pre-deploy-command "$PRE_DEPLOY" \
    --start-command "$START_CMD" \
    --health-check-path /health \
    --build-filter-path 'apps/api/**' \
    --build-filter-path 'packages/shared/**' \
    --build-filter-path 'pnpm-lock.yaml' \
    --build-filter-path 'package.json' \
    --build-filter-path 'pnpm-workspace.yaml' \
    --build-filter-path 'turbo.json' \
    --build-filter-path 'render.yaml' \
    --env-var "NODE_ENV=production" \
    --env-var "GEMINI_MODEL=${GEMINI_MODEL:-gemini-3.5-flash}" \
    --env-var "DATABASE_URL=${DATABASE_URL}" \
    --env-var "DIRECT_URL=${DIRECT_URL}" \
    --env-var "JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}" \
    --env-var "JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}" \
    --env-var "SUPABASE_URL=${SUPABASE_URL}" \
    --env-var "SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}" \
    --env-var "GEMINI_API_KEY=${GEMINI_API_KEY}" \
    --env-var "RESEND_API_KEY=${RESEND_API_KEY}" \
    --env-var "EMAIL_FROM=${email_from}" \
    --env-var "CORS_ORIGINS=${CORS_ORIGINS}" \
    --confirm \
    -o json | python3 -c "import json,sys; print(json.load(sys.stdin).get('id',''))"
}

trigger_deploy() {
  local service_id="$1"
  echo "==> Triggering deploy for ${SERVICE_NAME} (${service_id})"
  render deploys create "$service_id" --wait --confirm
}

main() {
  require_render
  ensure_workspace

  echo "==> Active workspace:"
  render workspace current -o text
  echo

  local service_id
  service_id="$(find_service_id)"

  if [[ -z "$service_id" ]]; then
    echo "Service '${SERVICE_NAME}' not found in this workspace."
    service_id="$(create_service)"
  fi

  if [[ -z "$service_id" ]]; then
    service_id="$(find_service_id)"
  fi

  if [[ -n "$service_id" ]]; then
    trigger_deploy "$service_id"
    echo
    echo "Done. Logs: render logs ${service_id}"
  else
    echo "Could not resolve service id for '${SERVICE_NAME}'."
    exit 1
  fi
}

main "$@"
