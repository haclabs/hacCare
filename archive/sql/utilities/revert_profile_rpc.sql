-- Revert: Drop the RPC function we're not using
-- Run this in Supabase SQL Editor

DROP FUNCTION IF EXISTS public.get_user_profile_secure(uuid);
