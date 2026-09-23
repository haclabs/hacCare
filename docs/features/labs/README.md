# Laboratory System

Lab ordering, results management and reference-range tracking.

## Key features

- **Lab panels** — pre-configured test panels (CBC, CMP, lipid panel, …)
- **Reference ranges** — age- and sex-specific normal ranges, with categorical
  flagging for non-numeric results
- **Results management** — pending, completed and critical results, with
  acknowledgement
- **Ordering** — place and cancel lab orders against a patient
- **Integration** — results surface in the patient chart alongside vitals and
  the MAR

## Where the code lives

| Area | Path |
|---|---|
| Components | `src/features/patients/components/` (`LabOrderCard`, `CreateLabPanelModal`, `CreateLabResultModal`, `EditLabResultModal`, `LabAcknowledgeModal`) |
| Services | `src/features/patients/components/labService.ts`, `labOrderService.ts` |
| Catalog migration | `database/migrations/20260913000000_add_lab_test_catalog_entries.sql` |

Lab tables were created in the schema baseline rather than a standalone
migration; `supabase/migrations/20251113000000_initial_schema.sql` is the
current dump if you need the DDL.

## Related

- [Patient management](../patients/) — how results reach the chart
- [Simulation](../simulation/) — labs inside a simulation tenant are copied
  from the template snapshot and matched on `test_name` + `panel_name`, never
  by id or barcode (see `CLAUDE.md`)
