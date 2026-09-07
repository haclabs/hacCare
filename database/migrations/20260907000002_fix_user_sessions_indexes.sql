-- ============================================================================
-- PERF FIX: user_sessions missing FK index + drop unused index
-- ============================================================================
-- Found via Supabase Performance Advisor (2026-09-07), flagged by the user as
-- "feels slow" — investigated: table itself is small (~1k rows, 280kB), but:
--
-- 1. `fk_user_sessions_tenant` (tenant_id) has no covering index — any query
--    filtering/joining by tenant_id does a sequential scan. Not currently hit
--    by any live query (see companion cleanup below), but cheap to fix and
--    protects against future tenant-scoped queries on this table.
-- 2. `idx_user_sessions_last_activity` has NEVER been used (advisor-confirmed)
--    — the ORDER BY last_activity in getActiveSessions()/getRecentLoginHistory()
--    (services/admin/adminService.ts) was the only thing that could have used
--    it, and that whole read path is dead code being removed in this same
--    session (AdminDashboard.tsx was an orphaned route — no Sidebar link, no
--    reachable navigation path to tab=admin, confirmed via grep). Safe to drop.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_sessions_tenant_id ON public.user_sessions (tenant_id);

DROP INDEX IF EXISTS public.idx_user_sessions_last_activity;
