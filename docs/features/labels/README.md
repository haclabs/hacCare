# Label Printing

Barcode label generation for patient wristbands, medication labels and chart
labels.

## Key features

- **Avery 5160** — 30 labels/sheet (1" × 2-5/8"), the default
- **Avery 5167** — 80 labels/sheet (1/2" × 1-3/4"), small vial labels
- Patient wristbands, medication labels (dose/route/time), chart and specimen
  labels
- Print preview, and bulk printing across multiple patients

## Where the code lives

| Component | Path |
|---|---|
| `BarcodeLabelSheetModal`, `BulkLabelPrint`, `SmallVialLabelSheetModal` | `src/features/admin/components/` |
| `MedicationLabelsModal`, `AllLabelsModal` | `src/features/simulation/components/` |
| `PatientBraceletsModal` | `src/features/patients/components/` |

Barcodes are regenerated on every simulation launch, so never match template
records to simulation records by barcode — see `CLAUDE.md`.

## Related

- [BCMA](../bcma/) — scanning these labels at administration
