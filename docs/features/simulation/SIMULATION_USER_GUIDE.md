# Simulation System User Guide

## Overview
The Simulation System v2.0 allows instructors to create reusable simulation templates and launch them for training sessions with students.

## Workflow

### Step 1: Create a Template
1. Navigate to **Simulations → Templates** tab
2. Click **"Create Template"** button
3. Fill in:
   - **Name**: Descriptive name for your simulation
   - **Description**: What this simulation covers
   - **Default Duration**: How long simulations typically run (in minutes)
4. Click **"Create"**
5. A new template is created with status: `draft`

**What happens behind the scenes:**
- A new simulation tenant is created
- A template record is saved in the database
- The template is ready for scenario building

---

### Step 2: Build Your Scenario
1. Switch to the template's tenant (via tenant selector)
2. Build your simulation scenario using the normal hacCare interface:
   - **Add Patients** with relevant medical histories
   - **Set up Medications** and treatment plans
   - **Configure Vitals** and assessment data
   - **Add Wound Care**, diabetic records, or other specialty data
   - Add any other relevant patient information

**Important:** You're working in an isolated tenant, so your changes won't affect production data.

---

### Step 3: Save Snapshot
1. Once your scenario is complete, return to **Simulations → Templates**
2. Find your template
3. Click the **"Save Snapshot"** button (💾 icon)
4. The system captures all data in the template tenant
5. Template status changes from `draft` to `ready`
6. A green "Snapshot saved" indicator appears

**What gets saved in the snapshot:**
- All patients and their data
- Medications and prescriptions
- Vital signs records
- Admission records
- Diabetic records
- Wound care assessments
- Any other data in the template tenant

---

### Step 4: Launch Simulation
1. Click the **"Launch"** button (▶️) on a ready template
2. Configure the simulation:
   - **Name**: Specific name for this simulation instance
   - **Duration**: How long this run should last
   - **Participants**: Select users and assign roles:
     - **Instructor**: Can manage the simulation
     - **Student**: Participates in training
3. Click **"Launch Simulation"**

**What happens:**
- A new simulation tenant is created
- All snapshot data is restored to this new tenant
- Selected participants are granted access
- Simulation appears as **Ready to Start**; the timer starts when you press **Start** (▶)
- Participants can log in and work with the simulation data once it is started

---

## Status Indicators

### Template Status
- **🔵 draft** - Template is being built, no snapshot saved yet (cannot launch)
- **🟢 ready** - Snapshot saved, ready to launch
- **⚫ archived** - Template no longer in active use

### Simulation Status
- **🟡 pending** - Created but not started
- **🟢 running** - Currently active
- **🟠 paused** - Legacy status; pausing was removed (Start returns these to running)
- **✅ completed** - Finished successfully
- **⏱️ expired** - Time limit reached
- **❌ cancelled** - Manually stopped

---

## Tips & Best Practices

### 💡 Reusability
- One template can be launched multiple times
- Each launch creates a separate, isolated environment
- Perfect for running the same scenario with different groups

### 💡 Snapshot Updates
- You can update a template and save a new snapshot anytime
- New launches will use the updated snapshot
- Existing running simulations are not affected

### 💡 Participant Roles
- **Instructors** can:
  - View all simulation data
  - Manage the simulation
  - Generate debrief reports
- **Students** can:
  - Access and work with patient data
  - Practice clinical workflows
  - Learn in a safe environment

### 💡 Duration Management
- Set realistic durations for your scenarios
- Simulations cannot be paused; the timer runs from Start until Complete or Reset
- Expired simulations are automatically archived

### 💡 Data Isolation
- Each simulation runs in its own tenant
- Changes in simulations don't affect templates
- Templates don't affect production data
- Perfect for safe learning environments

---

## Troubleshooting

### ❌ "Template not found or not ready"
**Problem:** Trying to launch a template without a saved snapshot.
**Solution:** 
1. Build your scenario in the template tenant
2. Click "Save Snapshot" button
3. Wait for confirmation
4. Try launching again

### ❌ "Template has no snapshot data"
**Problem:** Template exists but snapshot was never saved.
**Solution:** Same as above - save a snapshot first.

### ❌ Can't see participants in simulation
**Problem:** Users weren't added to the simulation at launch.
**Solution:** 
1. Complete or cancel the current simulation
2. Launch a new one
3. Make sure to select participants before launching

### ❌ Snapshot button disabled
**Problem:** No changes to save or missing permissions.
**Solution:** 
1. Make sure you've added data to the template tenant
2. Verify you have admin/super_admin role
3. Check you're viewing the correct tenant

---

## Workflow Diagram

```
┌─────────────────┐
│ Create Template │ (draft status)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Build Scenario  │ (add patients, meds, etc.)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Save Snapshot   │ (ready status)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Launch Sim      │ (create new tenant)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Run Training    │ (students practice)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Complete/Expire │ (archive & debrief)
└─────────────────┘
```

---

## Quick Reference

| Action | Location | Button | Requirements |
|--------|----------|--------|--------------|
| Create Template | Templates Tab | Create Template | Admin role |
| Build Scenario | Template Tenant | (use normal UI) | Switch to template tenant |
| Save Snapshot | Templates Tab | 💾 Save | Data in template tenant |
| Launch Simulation | Templates Tab | ▶️ Launch | Template must be "ready" |
| View Active | Active Tab | - | Simulation running |
| Generate Report | History Tab | 📊 Debrief | Simulation completed |

---

## Need Help?

If you encounter issues:
1. Check the in-app error messages
2. Review this guide
3. Verify your user role/permissions
4. Check that you followed all steps in order
5. Contact your system administrator
