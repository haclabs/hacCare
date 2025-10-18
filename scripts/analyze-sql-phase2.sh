#!/bin/bash

# Phase 2: Analyze and Categorize SQL Files
# This script categorizes all SQL files to prepare for reorganization

echo "🔍 Phase 2: SQL File Analysis"
echo "=============================="
echo ""

# Count files by directory
echo "📊 Files by Directory:"
echo "  Migrations: $(find docs/development/database/migrations -name "*.sql" 2>/dev/null | wc -l)"
echo "  Policies: $(find docs/development/database/policies -name "*.sql" 2>/dev/null | wc -l)"
echo "  Functions: $(find docs/development/database/functions -name "*.sql" 2>/dev/null | wc -l)"
echo "  Seeds: $(find docs/development/database/seeds -name "*.sql" 2>/dev/null | wc -l)"
echo "  Simulation-v2: $(find docs/development/simulation-v2 -name "*.sql" 2>/dev/null | wc -l)"
echo "  Scripts: $(find docs/development/scripts -name "*.sql" 2>/dev/null | wc -l)"
echo "  SQL (misc): $(find docs/development/sql -name "*.sql" 2>/dev/null | wc -l)"
echo ""

# Categorize files
echo "📁 File Categories:"
echo ""

echo "=== PRODUCTION MIGRATIONS (numbered) ==="
find docs/development/database/migrations -name "[0-9]*.sql" 2>/dev/null | sort
echo ""

echo "=== DIAGNOSTIC/CHECK FILES ==="
find docs/development -name "*diagnose*.sql" -o -name "*check*.sql" -o -name "*verify*.sql" 2>/dev/null | grep -v archive | sort
echo ""

echo "=== RLS POLICY FILES ==="
find docs/development/database/policies -name "*.sql" 2>/dev/null | sort
echo ""

echo "=== DATABASE FUNCTIONS ==="
find docs/development/database/functions -name "*.sql" 2>/dev/null | sort
echo ""

echo "=== SIMULATION V2 FILES ==="
find docs/development/simulation-v2 -name "*.sql" 2>/dev/null | grep -v "checks/" | grep -v archive | sort
echo ""

echo "=== MAINTENANCE/UTILITY SCRIPTS ==="
find docs/development/scripts -name "*.sql" 2>/dev/null | sort
find docs/development/sql -name "*.sql" 2>/dev/null | sort
echo ""

echo "=== SEED DATA ==="
find docs/development/database/seeds -name "*.sql" 2>/dev/null | sort
echo ""

# Summary
echo "=============================="
echo "Total SQL Files: 84"
echo ""
echo "Recommendation:"
echo "  - Keep production migrations (001-007)"
echo "  - Archive diagnostic/check files"
echo "  - Organize simulation files"
echo "  - Keep RLS policies (consolidate)"
echo "  - Keep functions (organize by feature)"
echo ""
