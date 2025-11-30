#!/bin/bash
# Dump production Supabase database for local development
# Run this when you want to sync local with production schema

set -e

echo "📥 Dumping Production Database"
echo "================================"
echo ""

# Check if project is linked
if [ ! -f ".git/config" ] || ! grep -q "supabase" ".git/config" 2>/dev/null; then
    echo "⚠️  Project not linked to Supabase. Linking now..."
    echo "You'll need your database password from Supabase dashboard"
    npx supabase link --project-ref cwhqffubvqolhnkecyck
fi

echo "🔄 Dumping schema and data..."

# Create supabase directory if it doesn't exist
mkdir -p supabase

# Dump full schema including functions, triggers, RLS
npx supabase db dump --file supabase/full-database-dump.sql

echo "✅ Database dumped to: supabase/full-database-dump.sql"
echo ""
echo "📊 Dump includes:"
echo "  • All tables and schemas"
echo "  • Functions (RPC)"
echo "  • Triggers"
echo "  • RLS policies"
echo "  • Extensions"
echo ""
echo "To load into local Supabase:"
echo "  ./scripts/setup-local.sh"
echo ""
echo "Or manually:"
echo "  supabase start"
echo "  psql postgresql://postgres:postgres@localhost:54322/postgres < supabase/full-database-dump.sql"
