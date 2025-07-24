# SQL Patches for hacCare Multi-Tenant System

This folder contains SQL patches that were created to fix various issues in the hacCare multi-tenant system. Below is the order in which they should be applied to a fresh Supabase instance:

## Essential Patches (Run in Order)

### 1. Core Database Setup
- **`fix-tenant-constraint.sql`** - Removes NOT NULL constraint from tenants.admin_user_id
- **`setup-profiles-and-tables.sql`** - Creates profiles, tenants, and tenant_users tables with proper structure
- **`quick-fix-function.sql`** - Adds the essential assign_user_to_tenant function

### 2. RLS Policy Fixes
- **`fix-rls-recursion.sql`** - Fixes infinite recursion in Row Level Security policies
- **`fix-user-lookup-functions.sql`** - Creates robust user lookup functions

## Optional/Diagnostic Patches

### Debugging & Testing
- **`debug-user-creation.sql`** - Diagnostic queries to check user creation issues
- **`diagnose-patient-user-issue.sql`** - Diagnostic queries for patient/user data integrity
- **`test-user-creation-console.js`** - Browser console script to test user creation process

### Additional Enhancements
- **`fix-missing-function.sql`** - Complete version with additional helper functions
- **`enhanced-create-tenant-modal.tsx`** - React component example for better tenant creation UI

## Quick Setup for New Instances

If setting up a fresh Supabase instance, run these patches in order:

1. `fix-tenant-constraint.sql`
2. `setup-profiles-and-tables.sql`
3. `quick-fix-function.sql`
4. `fix-rls-recursion.sql`
5. `fix-user-lookup-functions.sql`

## Issues Fixed

- ✅ Missing assign_user_to_tenant function
- ✅ Infinite recursion in RLS policies
- ✅ Tenant creation requiring UIDs instead of emails
- ✅ User creation not showing up in lists
- ✅ Database constraint violations
- ✅ Missing profiles table and auto-profile creation

## Notes

- All patches are designed to be idempotent (safe to run multiple times)
- Patches include proper error handling and fallbacks
- Functions use SECURITY DEFINER to bypass RLS when needed
- Created for remote Supabase instances (not local development)
