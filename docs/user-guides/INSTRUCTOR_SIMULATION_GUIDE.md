# Simulation Training System - Instructor Guide

**Quick Reference Guide for Creating and Managing Clinical Simulations**

---

## Overview

The Simulation Training System allows instructors to create reusable templates, launch live simulations, and review student performance through comprehensive debrief reports. This guide covers the complete workflow from template creation to session completion.

---

## 1. Creating a New Template

Templates are reusable simulation scenarios that can be launched multiple times with different student groups.

### Steps:

1. Navigate to the **Templates** tab
2. Click **Create New Template**
3. Enter the following information:
   - **Name**: Descriptive title (e.g., "Post-Operative Care - Day 1")
   - **Description**: Scenario overview and learning objectives
   - **Default Duration**: Standard session length in minutes (typically 60-120)
4. Click **Create Template**

**[SCREENSHOT PLACEHOLDER: Template creation form]**

### Result:
Your new template appears in the Templates list with "Draft" status.

---

## 2. Adding Patients and Clinical Data

Once your template is created, add patient data that students will work with during the simulation.

### Available Data Types:

- **Patient Demographics**: Name, age, medical record number, allergies
- **Vital Signs**: Baseline vital signs for the scenario
- **Medications**: Current medication orders and administration schedule
- **Lab Results**: Recent laboratory values
- **Doctor's Orders**: Active orders for student acknowledgment
- **Devices**: IVs, catheters, feeding tubes, drains, chest tubes
- **Wounds**: Pressure injuries, surgical wounds, drainage sites
- **Patient Notes**: Existing documentation and history
- **Intake & Output**: Baseline I&O data

### Important Notes:

- All data entered becomes the **baseline** for every simulation launched from this template
- Students will see this data when the simulation starts
- Student entries (vitals they record, meds they give) are tracked separately
- Baseline data is restored each time you reset between student groups

**[SCREENSHOT PLACEHOLDER: Template editing interface showing patient data sections]**

---

## 3. Saving the Snapshot

After adding all baseline patient data, you must save a snapshot before launching simulations.

### What is a Snapshot?

A snapshot captures the current state of all patient data in the template. This frozen state is restored each time you launch or reset a simulation, ensuring every student group starts with identical conditions.

### Steps:

1. Complete adding all patient data to your template
2. Click **Save Snapshot** in the template actions menu
3. Wait for confirmation message: "Snapshot saved successfully"
4. Template status changes to "Active" and can now be launched

### Critical Rule:

**ALWAYS save a new snapshot after making changes to template data.** Otherwise, simulations will launch with outdated information.

**[SCREENSHOT PLACEHOLDER: Save Snapshot button and confirmation]**

---

## 4. Launching a Simulation

Launch creates a live simulation session that students can access.

### Steps:

1. Navigate to the **Active** tab
2. Select your template from the dropdown
3. Configure the session:
   - **Session Name**: Include group number and date (e.g., "Group 3 - Nov 17, 2025")
   - **Duration**: Override template default if needed (in minutes)
   - **Participants**: Select student users who will participate
4. Click **Launch Simulation**

### What Happens:

- New tenant environment is created with clean patient data
- Baseline data from snapshot is loaded
- Timer starts counting down from specified duration
- Students can now log in and begin clinical activities
- All student actions are tracked for the debrief report

**[SCREENSHOT PLACEHOLDER: Launch simulation form with settings]**

---

## 5. Monitoring Active Simulations

While students work, you can monitor their progress from the Active tab.

### Information Displayed:

- Time remaining in session
- Number of participants
- Current status (Running, Paused, Expired)
- Quick actions: Complete, Reset, or Terminate

### Timer Behavior:

- **Green**: Plenty of time remaining
- **Amber**: Less than 15 minutes left
- **Red**: Less than 5 minutes left
- **Expired**: Time has run out (can still complete normally)

**[SCREENSHOT PLACEHOLDER: Active simulation card showing status and timer]**

---

## 6. Completing a Simulation

Mark the simulation complete when students finish their clinical work.

### Steps:

1. Click **Complete Simulation** on the active session card
2. Confirm the completion action
3. Session moves to **History** tab
4. Debrief report becomes available

### What Gets Captured:

- All vital signs students recorded
- All medications students administered (with BCMA compliance tracking)
- All doctor's orders acknowledged
- All lab orders placed and results acknowledged
- All patient notes and handover documentation
- All device assessments performed
- All wound assessments completed
- All intake and output entries
- Complete activity timeline for each student

**[SCREENSHOT PLACEHOLDER: Complete simulation confirmation dialog]**

---

## 7. Viewing the Debrief Report

Access comprehensive performance analytics after completing a simulation.

### Steps:

1. Navigate to **History** tab
2. Find your completed simulation
3. Click **View Debrief**

### Report Sections:

#### Overview Metrics
- Session duration and completion time
- Number of participants
- Total clinical entries
- Average entries per student

#### Performance Metrics
- BCMA compliance percentage
- Total interventions by category
- Documentation completeness
- Activity breakdown with visual progress bars

#### Student Activity Log
- Individual student sections (expandable)
- All activities grouped by type
- Timestamps for each entry
- Device assessment details (expandable JSONB fields)
- Wound assessment documentation

#### Instructor Notes
- Add feedback and observations
- Print or download PDF for records

**[SCREENSHOT PLACEHOLDER: Debrief report overview with metrics cards]**

**[SCREENSHOT PLACEHOLDER: Student activity section with expandable details]**

---

## 8. Resetting for Next Group

Use the same simulation template with a new student group without recreating everything.

### Steps:

1. From **Active** tab, click **Reset Simulation**
2. Confirm the reset action
3. System performs automatic cleanup:
   - Deletes all student work (meds, vitals, notes, assessments)
   - Restores baseline data from template snapshot
   - Preserves patient barcode IDs (printed labels still work)
   - Resets timer to original duration

### Important:

- Patient demographics stay identical (same names, MRNs, barcodes)
- Students start with clean slate but identical baseline conditions
- Previous session data is archived in History
- You can reset as many times as needed for different groups

**[SCREENSHOT PLACEHOLDER: Reset simulation confirmation]**

---

## 9. Best Practices

### Template Management
- Use descriptive names that indicate difficulty level or learning focus
- Update snapshot whenever baseline data changes
- Test templates with a practice session before using with students
- Keep templates organized by course or unit

### Session Planning
- Launch simulations 10-15 minutes before students arrive
- Verify all baseline data loaded correctly
- Have printed barcode labels ready for BCMA scenarios
- Brief students on login procedure and navigation

### During Sessions
- Monitor timer to give students time warnings
- Watch for technical issues students might encounter
- Take notes for instructor feedback section
- Allow 5-10 minutes buffer at end for documentation completion

### Debrief Best Practices
- Review report immediately after completion
- Note both strengths and improvement areas
- Use metrics to guide discussion (BCMA compliance, documentation gaps)
- Save or print report for student records
- Share key metrics with students during debrief discussion

### Reset Workflow
- Complete current session and review debrief first
- Reset immediately before next group arrives
- Verify timer reset correctly
- Confirm student roster updated for new group
- Quick spot-check that baseline data restored

---

## 10. Troubleshooting

### "Save Snapshot Failed"
- Ensure all required patient data is entered
- Verify you have admin or instructor permissions
- Check that template is not currently being used in active simulation

### "Launch Failed"
- Confirm template has a saved snapshot
- Verify template status is "Active"
- Check that selected participants have valid user accounts

### "Student Can't See Simulation"
- Confirm student is in participants list
- Verify student has "simulation user" role
- Check simulation status is "Running" not "Draft"

### "Reset Not Working"
- Ensure simulation is completed first
- Verify you have instructor permissions
- Check that no students are currently logged into the session

### "Debrief Shows Zero Activities"
- Confirm students logged in with correct credentials
- Verify students entered their names when prompted
- Check that simulation was properly completed (not terminated early)

---

## 11. Keyboard Shortcuts & Tips

### Navigation
- **Tab + T**: Jump to Templates tab
- **Tab + A**: Jump to Active simulations
- **Tab + H**: Jump to History

### Quick Actions
- Click simulation name for quick overview
- Use status badges to filter by state
- Sort history by completion date (newest first)

### Time Savers
- Duplicate existing template instead of creating from scratch
- Save template snapshots after major updates
- Use consistent naming conventions for easy searching
- Tag templates with course codes in description

---

## Support and Additional Resources

### Technical Documentation
- Database Schema: `/docs/database/`
- API Documentation: `/docs/architecture/`
- Reset System Details: `/docs/operations/SIMULATION_RESET_SYSTEM.md`

### Contact Support
For technical issues or questions not covered in this guide, contact your system administrator or IT support team.

---

**Document Version**: 1.0  
**Last Updated**: November 17, 2025  
**For**: Clinical Nursing Simulation Platform (hacCare)
