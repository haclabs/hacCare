#!/bin/bash

# Multi-Tenant Testing Script for hacCare Platform
# This script provides commands to test the multi-tenant functionality

echo "🏥 hacCare Multi-Tenant Testing Script"
echo "====================================="
echo

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo "This script will help you test the multi-tenant functionality."
echo "Make sure you have:"
echo "1. ✅ Run the database migration"
echo "2. ✅ Seeded test data"
echo "3. ✅ Started the development server"
echo

# Test checklist
echo "🧪 TESTING CHECKLIST"
echo "==================="
echo

print_step "Database Setup"
echo "   □ Migration applied (supabase/migrations/001_add_organizations_and_tenant_support.sql)"
echo "   □ Seed data loaded (supabase/seeds/001_organizations_test_data.sql)"
echo "   □ RLS policies enabled"
echo

print_step "User Authentication"
echo "   □ Create test users in different organizations"
echo "   □ Assign proper roles (nurse, admin, super_admin)"
echo "   □ Test login with different users"
echo

print_step "Data Isolation"
echo "   □ Login as nurse from 'General Hospital'"
echo "   □ Verify only General Hospital patients are visible"
echo "   □ Login as nurse from 'Pediatric Center'"
echo "   □ Verify only Pediatric Center patients are visible"
echo "   □ Confirm no cross-tenant data access"
echo

print_step "Super Admin Functionality"
echo "   □ Login as super admin"
echo "   □ Access Tenant Management (/admin/tenants)"
echo "   □ View all organizations"
echo "   □ Switch between organizations"
echo "   □ Create new organization"
echo "   □ Edit existing organization"
echo

print_step "Organization Switcher"
echo "   □ Verify switcher appears in header for super admin"
echo "   □ Test switching between organizations"
echo "   □ Confirm patient data updates after switch"
echo "   □ Verify regular users don't see switcher"
echo

print_step "API Testing"
echo "   □ Test patient creation in current organization"
echo "   □ Verify patients are assigned correct organization_id"
echo "   □ Test patient updates maintain organization"
echo "   □ Test patient deletion within organization"
echo

echo
print_warning "SECURITY TESTING"
echo "=================="
echo "□ Test RLS policy enforcement in Supabase dashboard"
echo "□ Attempt cross-tenant access via direct API calls"
echo "□ Verify JWT token validation"
echo "□ Test role-based access control"
echo

echo
print_success "VALIDATION QUERIES"
echo "=================="
echo
echo "Run these SQL queries in Supabase to validate setup:"
echo
echo "-- Check organization distribution"
echo "SELECT o.name, COUNT(p.*) as patient_count"
echo "FROM organizations o"
echo "LEFT JOIN patients p ON o.id = p.organization_id"
echo "GROUP BY o.id, o.name;"
echo
echo "-- Check user assignments"
echo "SELECT u.email, u.role, o.name as organization"
echo "FROM user_profiles u"
echo "LEFT JOIN organizations o ON u.organization_id = o.id;"
echo
echo "-- Verify RLS policies"
echo "SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual"
echo "FROM pg_policies"
echo "WHERE tablename IN ('patients', 'patient_vitals', 'patient_notes', 'organizations');"
echo

echo
print_step "Development Server Commands"
echo "npm run dev          # Start development server"
echo "npm run build        # Build for production"
echo "npm run preview      # Preview production build"
echo

echo
print_success "🎉 Ready to test multi-tenant functionality!"
echo "Visit http://localhost:5173 and follow the checklist above."