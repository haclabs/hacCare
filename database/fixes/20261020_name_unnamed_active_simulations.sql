-- One-off: name active simulations that were launched with a blank name.
-- Applied 2026-10-20 (7 rows). Each gets its template's name, trimmed.
--
-- Before this date the Launch button sat outside the modal's <form>, so the
-- name input's `required` never fired and blank names were accepted.
-- launch_simulation built those tenant names as 'sim_active__<epoch>'; the
-- tenant name is rewritten to 'sim_active_<name>_<epoch>' to match. The
-- subdomain ('sim-act--xxxxxxxx') is left as is: nothing routes by it.
-- Safe to re-run: only touches rows whose name is still blank.

WITH targets AS (
  SELECT sa.id, sa.tenant_id, btrim(st.name) AS new_name
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  WHERE btrim(coalesce(sa.name, '')) = ''
), upd_t AS (
  UPDATE tenants t
     SET name = regexp_replace(t.name, '^sim_active__', 'sim_active_' || x.new_name || '_')
    FROM targets x
   WHERE t.id = x.tenant_id
     AND t.name LIKE 'sim\_active\_\_%'
  RETURNING t.id
), upd_s AS (
  UPDATE simulation_active sa
     SET name = x.new_name, updated_at = now()
    FROM targets x
   WHERE sa.id = x.id
  RETURNING sa.id, sa.name
)
SELECT (SELECT count(*) FROM upd_t) AS tenants_updated,
       (SELECT json_agg(upd_s) FROM upd_s) AS sims_updated;
