# Patient Management

Patient records, charting and the clinical modules that hang off them.

## Where the code lives

| Area | Path |
|---|---|
| Feature root | `src/features/patients/` |
| Hooks | `src/features/patients/hooks/` (see `useMultiTenantPatients.ts` for the canonical tenant-scoped query) |

Patient tables and the four wirings a new `patient_*` table needs are
documented in `CLAUDE.md` and [ADDING_PATIENT_FEATURES](../../database/ADDING_PATIENT_FEATURES.md).

## Related

- [BCMA](../bcma/) — medication administration
- [Labs](../labs/) — lab results in the chart
- [Simulation](../simulation/) — patient data inside a simulation tenant
