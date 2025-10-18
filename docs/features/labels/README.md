# 🏷️ Label Printing System

Professional barcode label generation for patient wristbands, medication labels, and chart labels.

## 📄 Documentation

### User Guides
- **[Quick Start Guide](QUICK_START_REUSABLE_LABELS.md)** - Get started with label printing
- **[Visual Guide](VISUAL_GUIDE_REUSABLE_LABELS.md)** - Step-by-step with screenshots
- **[Reusable Simulation Labels](../simulation/REUSABLE_SIMULATION_LABELS_GUIDE.md)** - Label printing in simulations

### Technical
- **[Implementation Checklist](IMPLEMENTATION_CHECKLIST_REUSABLE_LABELS.md)** - Technical implementation details
- **[Solution Summary](SOLUTION_DELIVERED_REUSABLE_LABELS.md)** - Complete solution overview
- **[Index](INDEX_REUSABLE_LABELS.md)** - Master index of label documentation

## 🏥 Key Features

- **Avery 5160 Compatible:** Standard 30-label sheets (1" x 2-5/8")
- **Multiple Label Types:**
  - Patient Wristbands (UPC-128 barcodes)
  - Medication Labels (dose, route, time)
  - Chart Labels (quick patient identification)
  - Specimen Labels (lab sample tracking)
- **Print Preview:** See exactly what will print
- **Bulk Printing:** Generate labels for multiple patients
- **Reusable Templates:** Save time with pre-configured layouts

## 🔗 Related Documentation

- [BCMA System](../bcma/) - Barcode scanning integration
- [Simulation Labels](../simulation/REUSABLE_SIMULATION_LABELS_GUIDE.md) - Simulation-specific labels
- [Database Migrations](../../../database/migrations/013_reusable_simulation_labels.sql) - Label schema

## 🚀 Quick Start

1. Read [Quick Start Guide](QUICK_START_REUSABLE_LABELS.md)
2. Review [Visual Guide](VISUAL_GUIDE_REUSABLE_LABELS.md) for screenshots
3. Load Avery 5160 labels in printer
4. Generate and print

## 📋 Label Formats

- **Patient Wristband:** Barcode + Name + DOB + MRN
- **Medication Label:** Drug name + Dose + Route + Time + Barcode
- **Chart Label:** Patient name + Room + MRN
- **Specimen Label:** Patient info + Specimen type + Collection time
