#!/bin/bash
set -e

echo "🚀 JobPilot Dev Setup"
echo "====================="

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm is required. Install: npm install -g pnpm"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }

echo "✅ Prerequisites found"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Copy env files if not present
if [ ! -f web/.env.local ]; then
  cp web/.env.example web/.env.local
  echo "📋 Created web/.env.local — please fill in your values"
fi

if [ ! -f worker/.env.local ]; then
  cp worker/.env.example worker/.env.local
  echo "📋 Created worker/.env.local — please fill in your values"
fi

# Start Docker services
echo "🐳 Starting Docker services (Postgres + Redis)..."
docker compose up -d

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 3

# Check postgres
docker exec $(docker ps -qf "name=postgres") pg_isready -U jobpilot 2>/dev/null && echo "✅ PostgreSQL ready" || echo "⚠️  PostgreSQL not ready yet — run: docker compose up -d"

# Check redis
docker exec $(docker ps -qf "name=redis") redis-cli ping 2>/dev/null | grep -q PONG && echo "✅ Redis ready" || echo "⚠️  Redis not ready yet — run: docker compose up -d"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Fill in web/.env.local with your API keys"
echo "  2. Run: cd web && pnpm prisma db push"
echo "  3. Run: cd web && pnpm prisma db seed"
echo "  4. Run: pnpm dev"
