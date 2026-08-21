#!/bin/bash
# Un Click - Deploy Script
# 
# CRITICAL: wrangler.toml must be at the PROJECT ROOT level,
# with pages_build_output_dir pointing to a "build" subdirectory.
# The "functions/" dir must ALSO be at the project root (not inside build).
# This is the only way wrangler v4 properly picks up D1/R2 bindings.
#
# Directory structure:
#   /tmp/aunclick-project/
#   ├── wrangler.toml          <-- config (detected by wrangler)
#   ├── functions/             <-- Pages Functions (bundled separately)
#   └── build/                 <-- pages_build_output_dir (static assets)
#       ├── index.html
#       ├── js/
#       ├── css/
#       └── ...

set -e

PROJECT_DIR="/home/z/my-project"
BUILD_PARENT="/tmp/aunclick-project"
# CLOUDFLARE_API_TOKEN must be set as environment variable
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
  echo "ERROR: CLOUDFLARE_API_TOKEN environment variable is not set."
  echo "Export it before running: export CLOUDFLARE_API_TOKEN=your_token_here"
  exit 1
fi

export PATH="$PATH:/home/z/.npm-global/bin"

echo "=== Preparing build directory ==="
rm -rf "$BUILD_PARENT"
mkdir -p "$BUILD_PARENT/build"
mkdir -p "$BUILD_PARENT/functions"

# 1. Copy wrangler.toml to project root
cp "$PROJECT_DIR/wrangler.toml" "$BUILD_PARENT/wrangler.toml"

# 2. Copy functions to project root (outside build/)
cp -r "$PROJECT_DIR/functions/"* "$BUILD_PARENT/functions/"

# 3. Copy everything else to build/ (static assets)
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
  "$PROJECT_DIR/" "$BUILD_PARENT/build/"

echo "=== Deploying to Cloudflare Pages ==="
cd "$BUILD_PARENT"
npx wrangler pages deploy build --project-name=aunclick --branch=main --commit-dirty=true

echo "=== Deployment complete ==="