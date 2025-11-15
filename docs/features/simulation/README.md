# 🎮 Simulation System

Clinical scenario simulation and training platform with realistic patient data and workflows.

## 📄 Documentation

### User Guides
- **[Simulation User Guide](SIMULATION_USER_GUIDE.md)** - How to use the simulation system
- **[Reusable Simulation Labels Guide](REUSABLE_SIMULATION_LABELS_GUIDE.md)** - Label printing in simulations

### Technical
- **[Simulation Metrics Fix](SIMULATION_METRICS_FIX.md)** - Performance and metrics tracking

## 🏥 Key Features

- **Template-Based Scenarios:** Pre-configured simulation templates
- **Live Simulation:** Real-time patient monitoring and interventions
- **Snapshot/Restore:** Save and restore simulation states
- **Multi-Participant:** Support for multiple learners in same scenario
- **Metrics Tracking:** Performance analytics and debriefing data
- **Isolated Tenants:** Simulations run in dedicated tenant environments

## 🏷️ Barcode Label System

### Reusable Labels Across Sessions
The simulation system preserves patient and medication barcodes across simulation resets, allowing you to **print labels once** and reuse them for the entire semester.

**How it works:**
- Patient barcodes (e.g., `P51871`) stay consistent across all reset cycles
- Medication barcodes (e.g., `MZ30512`) are preserved by matching patient + medication name
- Print labels from your first active simulation and they'll work for every subsequent reset

**Workflow:**
1. Launch simulation from template (creates new tenant with unique barcodes)
2. Print patient and medication labels via Labels button
3. Run simulation with students
4. Reset simulation for next class
5. Same labels work - no reprinting needed!

**BCMA Compliance:**
- Dual-scan validation: patient barcode + medication barcode
- Tracked in debrief reports as "✓ BCMA Compliant" when both scans recorded
- Compliance metrics: `administered_correctly / total_administrations`

## 🔗 Related Documentation

- [Database Functions](../../../database/functions/simulation_snapshot_functions.sql) - Snapshot/restore logic
- [RLS Policies](../../../database/policies/simulation_rls.sql) - Simulation security
- [Development Work](../../development/simulation-v2/) - Simulation v2 development history

## 🚀 Quick Start

See [SIMULATION_USER_GUIDE.md](SIMULATION_USER_GUIDE.md) for complete usage instructions.
