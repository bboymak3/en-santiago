#!/bin/bash
# Deploy automático: GitHub + Cloudflare Pages
# Uso: bash deploy.sh
# Requiere: CLOUDFLARE_API_TOKEN en variable de entorno
# 
# Pasos:
# 1. git add + commit + push a GitHub (bboymak3/en-santiago)
# 2. Deploy a Cloudflare Pages (proyecto: en-santiago)
# 3. D1 + R2 bindings se preservan vía wrangler.toml

set -e

PROJECT_DIR="/home/z/my-project/repos/en-santiago"
BUILD_PARENT="/tmp/en-santiago-project"
CF_TOKEN="${CLOUDFLARE_API_TOKEN:-}"

if [ -z "$CF_TOKEN" ]; then
  echo "ERROR: Exporta CLOUDFLARE_API_TOKEN antes de ejecutar"
  echo "  export CLOUDFLARE_API_TOKEN=cfat_xxx"
  exit 1
fi

export PATH="$PATH:/home/z/.npm-global/bin"
cd "$PROJECT_DIR"

# ─── 1. PUSH A GITHUB ─────────────────────────────────────────
echo "=== 1. Git: sync con GitHub ==="
git add -A
if git diff --cached --quiet; then
  echo "    No hay cambios para commitear"
else
  COMMIT_MSG="${DEPLOY_MSG:-Update: $(date '+%Y-%m-%d %H:%M')}"
  git commit -m "$COMMIT_MSG"
  git push origin main
  echo "    ✓ Pushed to GitHub"
fi

# ─── 2. PREPARAR BUILD ────────────────────────────────────────
echo "=== 2. Preparando build ==="
rm -rf "$BUILD_PARENT"
mkdir -p "$BUILD_PARENT/build"
mkdir -p "$BUILD_PARENT/functions"

cp "$PROJECT_DIR/wrangler.toml" "$BUILD_PARENT/wrangler.toml"
cp -r "$PROJECT_DIR/functions/"* "$BUILD_PARENT/functions/"

rsync -a \
  --exclude='wrangler.*' \
  --exclude='functions' \
  --exclude='tool-results' \
  --exclude='skills' \
  --exclude='scripts' \
  --exclude='llm-*' \
  --exclude='globalpro*' \
  --exclude='html_part*' \
  --exclude='repo_*' \
  --exclude='_worker.js' \
  --exclude='tectonic' \
  --exclude='schema*.sql' \
  --exclude='.git' \
  "$PROJECT_DIR/" "$BUILD_PARENT/build/"

# ─── 3. DEPLOY A CLOUDFLARE PAGES ────────────────────────────
echo "=== 3. Deploy a Cloudflare Pages ==="
cd "$BUILD_PARENT"
npx wrangler pages deploy build \
  --project-name=en-santiago \
  --branch=main \
  --commit-dirty=true

echo ""
echo "=== ✓ Deploy completo ==="
echo "    GitHub:  https://github.com/bboymak3/en-santiago"
echo "    Preview: https://en-santiago.pages.dev"
