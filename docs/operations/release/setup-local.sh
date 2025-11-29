#!/bin/bash
# hacCare Installation Script
# Sets up local Supabase instance with production schema

set -e  # Exit on error

echo "🏥 hacCare Local Setup Script"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi
echo -e "${GREEN}✓${NC} Docker installed"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js installed ($(node --version))"

# Check Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} Supabase CLI not found, installing..."
    npm install -g supabase
fi
echo -e "${GREEN}✓${NC} Supabase CLI installed ($(supabase --version))"

echo ""
echo "🚀 Starting Supabase local instance..."
supabase start

# Wait for Supabase to be ready
echo "⏳ Waiting for Supabase to be ready..."
sleep 5

# Get connection info
echo ""
echo "📊 Local Supabase Info:"
supabase status

echo ""
echo "📥 Setting up database schema..."

# Check if we have a dump file
if [ -f "supabase/full-database-dump.sql" ]; then
    echo "Found existing database dump, loading..."
    psql postgresql://postgres:postgres@localhost:54322/postgres < supabase/full-database-dump.sql
    echo -e "${GREEN}✓${NC} Database schema loaded from dump"
elif [ -f "supabase/seed-production.sql" ]; then
    echo "Found production seed, loading..."
    psql postgresql://postgres:postgres@localhost:54322/postgres < supabase/seed-production.sql
    echo -e "${GREEN}✓${NC} Database schema loaded from seed"
else
    echo -e "${YELLOW}⚠${NC} No database dump found. Running migrations..."
    npx supabase db reset
    echo -e "${GREEN}✓${NC} Migrations applied"
fi

echo ""
echo "📦 Installing npm dependencies..."
npm install

echo ""
echo "🔑 Setting up environment variables..."

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    cat > .env.local << 'EOF'
# Local Supabase Configuration
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
EOF
    echo -e "${GREEN}✓${NC} Created .env.local with local Supabase credentials"
else
    echo -e "${YELLOW}⚠${NC} .env.local already exists, skipping"
fi

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "🎯 Next steps:"
echo "  1. Start the dev server:  npm run dev"
echo "  2. Open Studio:          http://localhost:54323"
echo "  3. Open App:             http://localhost:5173"
echo ""
echo "📝 Useful commands:"
echo "  supabase status         - Check Supabase status"
echo "  supabase stop          - Stop Supabase"
echo "  supabase db reset      - Reset database"
echo "  supabase db dump       - Dump production schema"
echo ""
echo "📚 Documentation: https://supabase.com/docs/guides/cli"
