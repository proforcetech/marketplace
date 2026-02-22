#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== Marketplace Development Setup ==="
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Error: Node.js is required. Install v20+."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "Error: pnpm is required. Run: corepack enable && corepack prepare pnpm@9.15.4 --activate"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Error: Docker is required."; exit 1; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "Error: Node.js 20+ is required. Current: $(node -v)"
  exit 1
fi

echo "1/5 Starting infrastructure services..."
cd "$ROOT_DIR/infrastructure"
docker compose up -d
echo "    Waiting for services to be healthy..."
sleep 5

echo "2/5 Installing dependencies..."
cd "$ROOT_DIR"
pnpm install

echo "3/5 Setting up environment..."
if [ ! -f "$ROOT_DIR/.env" ]; then
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  echo "    Created .env from .env.example -- review and update values."
else
  echo "    .env already exists, skipping."
fi

echo "4/5 Generating Prisma client..."
pnpm db:generate

echo "5/5 Running database migrations..."
pnpm db:migrate

echo ""
echo "=== Setup complete ==="
echo ""
echo "Start development:"
echo "  pnpm dev"
echo ""
echo "Services:"
echo "  Web:      http://localhost:3000"
echo "  API:      http://localhost:3001"
echo "  MinIO:    http://localhost:9001 (minioadmin/minioadmin)"
echo "  Mailpit:  http://localhost:8025"
echo "  Postgres: localhost:5432"
echo "  Redis:    localhost:6379"
