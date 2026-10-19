-- Remove a test dose from the "PNG 1146 - Heather" simulation template (applied 2026-10-19).
--
-- An instructor administered Dimenhydrinate while editing the template on 2026-09-09. Template
-- snapshots include medication_administrations and patient_medications.last_administered, so the
-- dose was copied into simulations launched from it: the MAR showed it as "Given", and an orphaned
-- administration row (medication_id still pointing at the template's medication) sat in the
-- running simulation.
--
-- Clears: the template's administration row and last_administered, the same two values inside
-- simulation_templates.snapshot_data, and the copied row in simulation tenant 4d6143df-….

DO $$
DECLARE
  c_template_id  CONSTANT uuid := '7b1f990a-436d-4f75-bc52-7a2f72a3243f';
  c_med_id       CONSTANT uuid := '86aaeb12-bdf4-4c4f-a434-59d07e34c51e';
  c_template_ma  CONSTANT uuid := '5b29a0e4-3357-4f0f-84d4-7b5931f2c32c';
  c_sim_ma       CONSTANT uuid := '77dc5fd1-2cf4-4429-93cd-e1784a211597';
BEGIN
  DELETE FROM medication_administrations WHERE id IN (c_template_ma, c_sim_ma);

  UPDATE patient_medications SET last_administered = NULL WHERE id = c_med_id;

  UPDATE simulation_templates
  SET snapshot_data = jsonb_set(
        jsonb_set(
          snapshot_data,
          '{medication_administrations}',
          COALESCE((
            SELECT jsonb_agg(e ORDER BY i)
            FROM jsonb_array_elements(snapshot_data->'medication_administrations') WITH ORDINALITY AS a(e, i)
            WHERE e->>'id' <> c_template_ma::text
          ), '[]'::jsonb)
        ),
        '{patient_medications}',
        (
          SELECT jsonb_agg(
                   CASE WHEN e->>'id' = c_med_id::text THEN jsonb_set(e, '{last_administered}', 'null'::jsonb) ELSE e END
                   ORDER BY i)
          FROM jsonb_array_elements(snapshot_data->'patient_medications') WITH ORDINALITY AS m(e, i)
        )
      )
  WHERE id = c_template_id;
END $$;
