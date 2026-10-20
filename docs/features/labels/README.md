# Label Printing

Barcode label generation for patient wristbands, medication labels and chart
labels.

## Key features

- **Avery 5160** — 30 labels/sheet (1" × 2-5/8"), the default
- **Avery 5167** — 80 labels/sheet (1/2" × 1-3/4"), small vial labels
- Patient wristbands, medication labels (dose/route/time), chart and specimen
  labels
- Print preview, and printing every label for a simulation from its Active Sims card

## Where the code lives

| Component | Path |
|---|---|
| `BarcodeLabelSheetModal`, `SmallVialLabelSheetModal` (Med Catalog sheets) | `src/features/admin/components/` |
| `SimulationLabelPrintModal`, `PatientBraceletsModal`, `MedicationLabelsModal`, `AllLabelsModal` | `src/features/simulation/components/` |

Patient IDs (and so wristband codes) are regenerated on every simulation launch,
so never match template records to simulation records by barcode — see
`CLAUDE.md`. Medication barcodes are stored on the row and carried through
launch, reset and sync, so medication labels can be reused.

## Related

- [BCMA](../bcma/) — scanning these labels at administration
