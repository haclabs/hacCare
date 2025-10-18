-- =====================================================
-- Fix IP Address Column to be Nullable
-- =====================================================
-- IP detection can fail due to CSP, network issues, etc.
-- Making it optional prevents login failures
-- Run in: Supabase SQL Editor
-- =====================================================

-- Make ip_address nullable in user_sessions table
ALTER TABLE public.user_sessions 
ALTER COLUMN ip_address DROP NOT NULL;

-- Verify the change
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_sessions'
  AND column_name = 'ip_address';
