-- One-time cleanup: strip the stale `tenant_users` (and `programs`) key that
-- save_template_snapshot_v2 / save_patient_template_snapshot used to
-- accidentally capture into snapshot_data before migration
-- 20260910000000_exclude_tenant_admin_tables_from_snapshot.sql. Harmless to
-- leave in place (restore_snapshot_to_tenant silently swallows the resulting
-- duplicate-key error), but this removes the log noise on next launch/reset
-- without waiting for every template to be manually re-saved.
--
-- Safe to re-run: the WHERE clause only matches rows that still have the
-- stale key(s).

-- Preview affected rows first
SELECT id, name, 'simulation_templates' AS source
FROM simulation_templates
WHERE snapshot_data ? 'tenant_users' OR snapshot_data ? 'programs'
UNION ALL
SELECT id, name, 'patient_templates' AS source
FROM patient_templates
WHERE snapshot_data ? 'tenant_users' OR snapshot_data ? 'programs';

-- Apply the cleanup
UPDATE simulation_templates
SET snapshot_data = snapshot_data - 'tenant_users' - 'programs'
WHERE snapshot_data ? 'tenant_users' OR snapshot_data ? 'programs'
RETURNING id, name;

UPDATE patient_templates
SET snapshot_data = snapshot_data - 'tenant_users' - 'programs'
WHERE snapshot_data ? 'tenant_users' OR snapshot_data ? 'programs'
RETURNING id, name;
