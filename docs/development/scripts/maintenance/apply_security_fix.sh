#!/bin/bash

# Security Fix Deployment Script for hacCare
# This script applies the security definer view fix and validates the changes

echo "🔧 Applying security fixes to hacCare database..."

# Apply the fix (you'll need to run this in your Supabase SQL editor or psql)
echo "📋 To apply the fix, run the following SQL in your Supabase dashboard:"
echo ""
echo "1. Go to Supabase Dashboard → SQL Editor"
echo "2. Paste and run the contents of: sql/fix_security_definer_view.sql"
echo ""

# Validation queries
echo "📊 After running the fix, validate with these queries:"
echo ""
echo "-- Check if the view was recreated properly:"
echo "SELECT schemaname, viewname, viewowner FROM pg_views WHERE viewname = 'recent_login_history';"
echo ""
echo "-- Verify no SECURITY DEFINER in the view definition:"
echo "SELECT definition FROM pg_views WHERE viewname = 'recent_login_history';"
echo ""
echo "-- Test the view with a sample query:"
echo "SELECT COUNT(*) FROM recent_login_history;"
echo ""

# Audit script
echo "🔍 For a comprehensive security audit, also run:"
echo "sql/security_audit.sql"
echo ""

echo "✅ Security fix preparation complete!"
echo ""
echo "📝 Next steps:"
echo "1. Run the SQL fix in Supabase"
echo "2. Re-run the Supabase linter to verify the warning is gone"
echo "3. Test the recent_login_history view functionality"