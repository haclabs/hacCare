/**
 * Knowledge Base Data
 * Article content for the hacCare KB. Organized by category.
 */

import { BookOpen, Users, Activity, Shield, PlayCircle, Tag, GraduationCap, Pill, Rocket } from 'lucide-react';
import type { ElementType } from 'react';

export interface KBArticle {
  id: string;
  title: string;
  content: string;
}

export interface KBCategory {
  id: string;
  title: string;
  description: string;
  icon: ElementType;
  iconBg: string;
  iconColor: string;
  articles: KBArticle[];
}

export const KB_CATEGORIES: KBCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'New to hacCare? Activate your account, sign in, and find your way around.',
    icon: Rocket,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-700',
    articles: [
      {
        id: 'welcome',
        title: 'Welcome to hacCare',
        content: `hacCare is a clinical simulation platform. Students use it exactly the way nurses use a real electronic health record — they open a patient chart, review orders, scan a wristband, administer medications, chart vitals, and document assessments.

The difference is that everything happens inside a sealed practice environment that you build and control. Nothing a student does in a simulation can reach real patient data, and nothing from one class section can reach another. hacCare contains no real patient information — every chart you see is one an instructor built.

As an instructor you work on the other side of that glass: you build the scenario, launch it for a class, watch it run, and afterwards review a report of everything each student did.

Your Role
Your account has a role attached to it, and that role decides what appears in your sidebar and which simulations you can open.
• Instructor — templates and simulations tagged with the program(s) you're assigned to
• Coordinator — everything within your institution
• Admin — everything within your institution, plus user management
• Super Admin — everything, across all institutions

Programs are the groupings your institution uses (for example NESA, PN, BNAD, or SIM Hub). You may be assigned to one or several.

If a colleague mentions a template you can't find, it is almost always because that template is tagged for a program you aren't assigned to. Your coordinator can add you to it.`,
      },
      {
        id: 'activate-account',
        title: 'Activating Your Account',
        content: `Your account is created by an administrator, not by you. You'll receive an email from noreply@haccare.app with the subject "Welcome to hacCare — Set up your account". Inside is a button that takes you to a page where you choose your own password.

No one at your institution ever sees or sets your password. The invite link is the only way in, and it's yours alone.

Step 1 — Activate
Clicking the button in the email opens the hacCare activation page, which shows a single "Activate Account" button. Click it.

Nothing happens until you click, and that's deliberate. Many school email systems automatically open every link in every incoming message to scan it for threats. A normal one-time activation link would be silently used up by that scanner before you ever saw the email, and you'd arrive to find a dead link. Putting a button in the way means the scanner sees a harmless page, and only a real human click activates the account.

Step 2 — Choose a password
You'll be asked to create a password twice — once to set it, once to confirm. It must have:
• At least 8 characters
• At least one uppercase letter
• At least one symbol, for example ! ? # or $

The page tells you immediately if something is missing, so you won't lose your work by submitting and starting over. Use a password you don't use anywhere else, and let your browser or password manager save it.

When both fields match and the rules are satisfied, click the button to finish. You'll be signed in automatically — there's no need to go back to the login page.

Troubleshooting
• Can't find the email — check your junk or clutter folder. The first message from a new sender often lands there. If it isn't there either, ask your administrator to resend the invitation.
• "Link expired" or "invalid" — the link has a limited lifetime and can only be used once. Ask your administrator to send a fresh invitation. This is normal and isn't a sign anything is broken.`,
      },
      {
        id: 'first-login',
        title: 'Your First Login and Choosing a Program',
        content: `The first time you land in hacCare, one of two things happens.

If you're assigned to one program, hacCare opens straight into it.

If you're assigned to several, a chooser appears asking which program you want to work in. Pick one — you aren't locked in. You can switch at any time from the coloured bar at the top of the screen, and hacCare remembers your last choice for next time.

The program bar
A blue-to-purple band runs across the top of the screen showing "Program Workspace" followed by the program you're currently in and its short code. This bar is your orientation: whenever you're unsure which program's material you're looking at, glance at it.

If you belong to more than one program, a "Switch Program" button sits at the right end of the bar.`,
      },
      {
        id: 'workspace-tour',
        title: 'Touring Your Program Workspace',
        content: `Your program workspace is your home screen, and it's the same screen you'll land on every time you sign in.

The three counters
• Templates — scenarios available to you, ready to be launched
• Students — students on your program's roster
• Sessions — simulations completed this semester

These are live. If a number looks wrong, it's usually a program-tagging question rather than missing data.

The six quick links
• Templates — build and manage simulation scenarios. This is where a scenario is born: you create a template, fill in a patient chart, and save it.
• Active Simulations — monitor and launch running sessions. Once a template is launched for a class, it lives here.
• Debrief Reports — review completed session activity. Every action every student took, grouped by student.
• Students — manage your simulation student roster.
• Knowledge Base — searchable how-to articles, including this one.
• Instructor Guide — a walkthrough of the full simulation workflow.

The same destinations are in the left sidebar under labels like Manage Sim, Students, and Help & Docs. Use whichever you prefer.

Why there are no patients here
Your workspace has no patients in it, and that's correct. Patients live inside templates and simulations, not in the workspace itself.`,
      },
      {
        id: 'how-simulations-work',
        title: 'How a Simulation Works (The Short Version)',
        content: `Knowing the shape of the workflow makes everything else easier to follow. There are four stages.

1. Build a template
A template is a complete practice hospital with your patient in it. You enter the chart once — history, medications, orders, vitals, wounds, devices — and save a snapshot. That snapshot is the frozen starting point.

2. Launch it
Launching creates a fresh, private copy of the template for one class session and gives your students access. The original template is untouched, so you can launch the same scenario as many times as you like.

3. Students work
They chart, scan, and administer inside their copy. Their work is theirs alone and never touches your template.

4. Reset or complete
Reset wipes the students' work and returns the scenario to its starting point, ready for the next group — printed barcode labels keep working, so you can reuse them all semester.
Complete ends the session and generates the debrief report.

For the full detail on each stage, see the Simulations category and the Instructor Guide tab under Manage Sim.`,
      },
      {
        id: 'where-to-get-help',
        title: 'Where to Get Help',
        content: `Help & Docs in the sidebar is the first place to look. It has:
• Articles — short how-to guides, searchable by keyword. Search looks inside the full text of every article, not just the titles.
• Walkthroughs — recorded click-by-click screen captures of common tasks.

The Instructor Guide tab inside Manage Sim covers the simulation workflow end to end.

The welcome tour you saw when you first signed in can be reopened any time using the "Replay welcome tour" button at the top of this page.

Still stuck? Contact your program coordinator.`,
      },
    ],
  },
  {
    id: 'simulations',
    title: 'Simulations',
    description: 'Creating templates, launching and managing simulations as an instructor.',
    icon: PlayCircle,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-700',
    articles: [
      {
        id: 'create-template',
        title: 'Creating a Simulation Template',
        content: `Templates are the foundation of every simulation. A template is a fully isolated environment where you build a patient scenario that can be launched repeatedly.

Step 1 — Create the Template
1. Navigate to Simulations → Templates tab
2. Click "Create Template"
3. Enter a name, description, and default duration
4. Click Create — this creates an isolated tenant for the template

Step 2 — Build Your Scenario
Click the Edit button on the template card. An orange "Editing Template" banner appears at the top confirming you're now working inside the template's tenant.

From here, use the normal hacCare interface — the same Overview action bar and Clinical Flowsheets hub students use — to:
• Add patients with realistic medical histories (or pull one in from the Patient Library — see the Patient Library article)
• Set up medications and prescriptions (Meds)
• Configure vitals and assessment data (Vitals & Assess. and the Flowsheets hub)
• Add device/wound placements (HacMap), intake & output baselines (I&O), and handover notes (Notes)
• Set up advanced directives or orders as needed (Orders)

Anything you enter while the orange banner is showing is saved as baseline data — it will be there every time the simulation launches or resets.

Step 3 — Save a Snapshot
When the scenario is ready:
1. Click "Save & Exit" in the orange banner
2. The system captures all template data into a snapshot
3. Template status changes from Draft → Ready ✓

A snapshot is the frozen copy used when launching simulations. You must save a snapshot before you can launch.`,
      },
      {
        id: 'patient-library',
        title: 'Patient Library: Reusable Patients Across Templates',
        content: `The Patient Library lets you build a single patient once — full chart and all — and reuse it in any number of simulation templates, instead of recreating the same patient from scratch every time.

Creating a Patient Template
1. Navigate to Simulations → Patient Library tab
2. Click "Create Patient Template"
3. Fill in the patient's demographics: name, DOB, gender, room/bed, condition, diagnosis, allergies, and emergency contact
4. Click Create — this creates a dedicated tenant with the patient already in it, and opens it in the orange "Editing Patient Template" banner
5. Build out the rest of the chart using the standard action bar and Flowsheets hub (meds, orders, labs, vitals, assessments, wounds/devices)
6. Click "Save & Exit" to capture a snapshot — the template's status changes to Ready

Adding a Library Patient into a Simulation Template
1. Open (Edit) the simulation template you want to add the patient to — the orange banner appears
2. Click "Add Patient from Library"
3. Pick any Ready patient template from the list and click Add
4. The patient is copied into your simulation template with a brand-new patient ID and barcode

Important notes:
• This is a one-time copy, not a live link — editing the original Patient Library entry afterward will NOT update copies already placed in simulation templates
• Only Ready (snapshot-saved) patient templates can be added
• Instructors only see patient templates tagged with their assigned program(s); admins/coordinators see all
• Remember to click "Save & Exit" on the simulation template afterward so the newly added patient is captured in its snapshot too`,
      },
      {
        id: 'launch-simulation',
        title: 'Launching a Simulation',
        content: `Only templates with status "Ready" (snapshot saved) can be launched.

1. Go to Simulations → Templates tab
2. Click the ▶ Launch button on a Ready template
3. Configure the simulation:
   • Name — a specific name for this session (e.g., "Nursing 101 - Morning Group")
   • Duration — how long the session runs
   • Select participants — assign students who will access this simulation
4. Click Launch

What happens behind the scenes:
• A new simulation tenant is created
• All snapshot data is copied into the new tenant (patients, medications, vitals, etc.)
• Each patient and medication gets a new unique barcode
• Selected students are granted access
• Simulation timer starts

Students can then access the simulation from their Simulation Portal.`,
      },
      {
        id: 'manage-simulations',
        title: 'Managing Active Simulations',
        content: `View and control running simulations from Simulations → Active tab.

Available actions:
• View Details — see which students are assigned and their activity
• Reset — restore the simulation to the original template snapshot (clinical data cleared, barcodes preserved for label reuse)
• Complete — mark the simulation as finished and generate a debrief report
• Delete — permanently remove the simulation

Resetting vs Completing:
• Reset: Wipes all student-entered data (vitals, MAR, assessments) and restores baseline from the template snapshot. Barcodes stay the same so printed labels still work.
• Complete: Ends the simulation, locks all data, and creates a debrief report for review.

Debrief Reports:
After completing, access the debrief from the History tab. You can review each student's interventions, medications administered, vitals recorded, and clinical documentation — all grouped by student.`,
      },
      {
        id: 'program-filtering',
        title: 'Program-Based Simulation Filtering',
        content: `Simulations and templates can be tagged with program categories (e.g., NESA, PN, SIM Hub, BNAD).

• Instructors only see simulations tagged with their assigned program(s)
• Admins and coordinators see everything
• Tags are set when creating or editing a simulation

To add/change program tags on an existing simulation:
1. Open the simulation in the Active or History tab
2. Click Edit Categories
3. Select the applicable programs
4. Save

If a simulation isn't appearing for an instructor, verify:
• The simulation has the correct program tag(s) applied
• The instructor is assigned to that program (Admin → User Management → Programs)`,
      },
    ],
  },
  {
    id: 'label-printing',
    title: 'Label Printing',
    description: 'Printing and reusing patient and medication barcodes for simulation sessions.',
    icon: Tag,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
    articles: [
      {
        id: 'label-overview',
        title: 'Understanding Simulation Barcodes',
        content: `hacCare uses barcodes for two purposes in simulations:

1. Patient Barcodes (format: P12345)
   — Printed on patient wristband labels
   — Used by students to identify a patient before medication administration

2. Medication Barcodes (format: MZ30512)
   — Printed on medication packaging labels
   — Used in the BCMA (Barcode Medication Administration) scanning workflow

Why barcodes persist across resets:
When you reset a simulation, patient and medication barcodes are preserved intentionally. This means you can print labels once per semester and reuse them every time the simulation resets — students scan the same physical labels throughout the course.

Label Format — Avery 5160 (30 labels per sheet):
• Patient labels: Name, Room, DOB, Allergies (red), Patient ID + barcode
• Medication labels: Drug name, dose, route, barcode`,
      },
      {
        id: 'print-patient-labels',
        title: 'Printing Patient Labels',
        content: `Patient labels are printed from the patient record inside a simulation tenant.

1. Log in to (or switch to) the active simulation tenant
2. Open the patient record
3. Click "Patient Labels" near the patient ID
4. A print preview opens showing the Avery 5160 label layout
5. Print on Avery 5160 sheets (30 labels per sheet)

Each label includes:
• Full patient name
• Room number
• Date of birth
• Allergies highlighted in red
• Patient ID (e.g., P12345) with barcode

Bulk label printing:
An instructor can also access Bulk Label Print from the Admin section to print all patient labels for a simulation in one pass — useful before a session starts.

Tips:
• Print labels before the simulation begins
• Laminate wristbands for repeated use across sessions
• Always verify the barcode scans correctly before distributing`,
      },
      {
        id: 'print-medication-labels',
        title: 'Printing Medication Labels',
        content: `Medication labels are printed from the MAR (Medication Administration Record) within a simulation tenant.

1. Open the simulation tenant
2. Navigate to a patient → MAR tab
3. Click the label/print icon next to a medication
4. The label preview opens with the medication barcode
5. Print on Avery 5160 or similar label stock

Each medication label includes:
• Medication name and dosage
• Route of administration
• Medication barcode (MZ format)

For BCMA workflow to work:
Both the patient wristband and the medication label must be scanned. If either barcode doesn't scan, check:
• Label is printed from the correct simulation tenant (not a template)
• The simulation hasn't been deleted and relaunched without reprinting
• Barcodes are not damaged — reprint if smudged

After a reset:
Barcodes are preserved on reset, so existing labels remain valid. Only if you delete a simulation and create a new one will you need to reprint.`,
      },
    ],
  },
  {
    id: 'student-guide',
    title: 'Student Guide',
    description: 'How to navigate hacCare, document care, and use barcode scanning during a simulation.',
    icon: GraduationCap,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-700',
    articles: [
      {
        id: 'entering-simulation',
        title: 'Entering a Simulation',
        content: `Your instructor will give you access to a simulation session before it begins.

How to enter:
1. Log in to hacCare with your student credentials
2. You'll be directed to the Simulation Portal
3. Your assigned simulation will appear as a card
4. Click "Enter Simulation" to begin

Important — Student Name requirement:
Every form and documentation entry in hacCare requires your name at the bottom before saving. This links your work to the debrief report your instructor reviews. Always fill in your full name before submitting.

What you'll see:
• A list of patients assigned to your simulation
• Click any patient card to open their full record

Navigation tip:
Use the module tabs at the top of a patient record (Vitals, MAR, Assessments, etc.) to move between areas. Click "Overview" breadcrumb to return to the main module view.`,
      },
      {
        id: 'documenting-care',
        title: 'Documenting Patient Care',
        content: `All clinical documentation is done inside the patient record. Here is what you'll commonly use:

Vitals — Record temperature, blood pressure, heart rate, oxygen saturation, and respiratory rate. Not all measurements are required — enter what is clinically available.

MAR (Medication Administration Record) — View scheduled medications. Use BCMA scanning to administer (see the BCMA article).

Clinical Forms — Nursing assessments, admission assessments, and bowel records are under the Forms tab. Patient ID, date, and your nurse name are pre-filled — do not change them.

Assessments — Quick physical, pain, or neurological assessments under the Assessments tab.

Wound/Device Care — Managed via hacMap (the interactive patient body diagram icon).

Advanced Directives — Review patient wishes from the Advanced Directives tab.

General tips:
• Fill in your student name on every form before saving
• You'll see a green confirmation toast at the bottom of the screen when saved
• If you make an error, let your instructor know — they can review all submissions in the debrief`,
      },
      {
        id: 'bcma-scanning',
        title: 'Barcode Medication Administration (BCMA)',
        content: `BCMA is the Five Rights verification workflow for medication administration. You must scan two barcodes before giving any medication.

The Five Rights:
1. Right Patient
2. Right Medication
3. Right Dose
4. Right Route
5. Right Time

How to administer using BCMA:
1. Navigate to the patient's MAR tab
2. Click the barcode/scan icon next to a medication
3. Scan 1: Patient wristband barcode (P12345)
4. Scan 2: Medication label barcode (MZ format)
5. Both must match — the system verifies identity and medication
6. Confirm administration details
7. Enter your student name and submit

If a scan fails:
• Ensure you are scanning the correct patient's wristband (not another patient's)
• Ensure the medication label belongs to this patient's prescription
• If the barcode doesn't scan, type the code manually in the input field
• If both are correct and it still fails, notify your instructor

Why this matters:
The BCMA scan creates an audit record tied to your student name. Your instructor can see exactly which medications you administered, in what order, and whether the Five Rights were followed — this forms part of your debrief.`,
      },
    ],
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'System requirements, first login, and orientation for new users.',
    icon: BookOpen,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-700',
    articles: [
      {
        id: 'welcome',
        title: 'Welcome to hacCare',
        content: `hacCare is a healthcare simulation platform designed for clinical education. It supports multi-tenant environments so each institution, program, and active simulation runs in its own isolated space.

Who uses hacCare:
• Students — participate in patient care simulations
• Instructors — manage simulations and templates, review debrief reports
• Coordinators/Admins — manage users, programs, and tenant settings
• Super Admins — cross-tenant access for platform management

System requirements:
• Modern web browser: Chrome, Firefox, Safari, or Edge (latest version)
• Stable internet connection
• Credentials provided by your administrator
• Recommended screen resolution: 1920×1080 or higher`,
      },
      {
        id: 'first-login',
        title: 'First Login & Navigation',
        content: `Logging in:
1. Navigate to your hacCare URL
2. Enter your email and password
3. Click Sign In

After login:
• Instructors are directed to their Program Workspace or the Simulation Portal
• Students are directed to the Simulation Portal if an active simulation is assigned
• Admins land on the main patient management dashboard

Navigation:
• Left sidebar — main navigation (role-dependent)
• Top bar — tenant switcher, user profile
• Breadcrumbs — appear inside patient records to help you navigate back

Switching tenants:
Use the tenant switcher in the top bar to move between your home tenant, program workspaces, simulation templates, and active simulations. Only tenants you have access to will appear.`,
      },
    ],
  },
  {
    id: 'patient-management',
    title: 'Patient Management',
    description: 'Viewing patients, updating records, and managing care documentation.',
    icon: Users,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-700',
    articles: [
      {
        id: 'patient-list',
        title: 'Viewing the Patient List',
        content: `The main dashboard shows all patients in your current tenant. Each patient card displays:
• Patient name, age, and gender
• Room and bed number
• Current condition
• Recent vital signs summary
• Allergy alerts (highlighted)
• Active medication count

Filtering and sorting:
• Use the search bar to filter by name or room
• Sort by name, room, or condition
• Active patients are shown by default; toggle to see discharged patients

Clicking a patient card opens their full record with tabbed navigation.`,
      },
      {
        id: 'patient-record',
        title: 'The Patient Record',
        content: `Opening a patient always lands you on the Overview screen. Below the patient's name and status is the action bar — one-click access to every module:

Chart — Full printable patient record (history, assessments, all documentation)
Flowsheets — Opens the Clinical Flowsheets hub, the central library of assessment and documentation forms (see the Clinical Flowsheets article)
Vitals & Assess. — Record and review vital signs plus head-to-toe and focused assessments
Meds — The Medication Administration Record (MAR); review orders and document administration (BCMA scanning happens here)
Labs — Laboratory results; a "NEW" badge flags unacknowledged results
Orders — Physician's orders for medications, treatments, and diagnostic tests; a "NEW" badge flags unacknowledged orders
HacMap — Interactive body diagram for documenting devices (IVs, catheters, tubes) and wound assessments by location
I&O — Intake & output tracking for fluid balance
Notes — Handover (SBAR) notes for shift-to-shift communication; a "NEW" badge flags unread notes

Below the action bar are two buttons: ID Bracelet (view/print the patient's identification bracelet) and Quick Intro (reopens the in-app student guide any time).

Each module is self-contained — changes saved in one don't affect another, but all data is linked to the same patient record.`,
      },
      {
        id: 'clinical-flowsheets',
        title: 'Clinical Flowsheets Hub',
        content: `The Flowsheets hub (opened from the Flowsheets icon in the action bar) is a single library for every assessment and documentation form, grouped into categories. Some cards open a form directly inline; others shortcut to an existing module (e.g. Vitals, HacMap, I&O).

Categories:
• Monitoring & Vitals — Vital signs, neurological, newborn, and pain assessments
• Systems Assessment — Respiratory, cardiovascular, GI, GU, musculoskeletal, and integumentary
• Risk & Safety — Fall risk (Morse), pressure injury risk (Braden), and restraint documentation
• Wound & Device Care — Device placement and wound assessment, both plotted on HacMap
• Fluid & Metabolic — Intake & output, bedside blood glucose (BBIT), and bowel assessment
• Mental Health & Cognition — Biopsychosocial, cognitive screening, and mood/affect assessments
• Clinical Documentation — Handover notes, advanced directives, nursing/admission assessments, consents, and BPMH

Use the sticky category nav at the top of the hub to jump straight to a section, or click "Patient Overview" to leave the hub.`,
      },
      {
        id: 'patient-labels',
        title: 'Generating Patient Labels',
        content: `Patient identification labels can be printed directly from the patient record.

1. Open the patient record
2. Click "Patient Labels" near the Patient ID field
3. A print preview opens with the Avery 5160 layout
4. Load Avery 5160 sheets (30 labels per sheet) into your printer
5. Print

Label contents:
• Full name
• Room number
• Date of birth
• Allergies in red
• Patient ID with barcode

In simulation environments, these labels are used as patient wristbands for BCMA scanning. See the Label Printing section for details on barcode reuse.`,
      },
    ],
  },
  {
    id: 'vital-signs',
    title: 'Vital Signs',
    description: 'Recording vitals, viewing trends, and understanding alert thresholds.',
    icon: Activity,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-700',
    articles: [
      {
        id: 'recording-vitals',
        title: 'Recording Vital Signs',
        content: `1. Open a patient record → Vitals tab
2. Click "Record Vitals"
3. Enter available measurements:
   • Temperature (°C)
   • Blood Pressure — systolic and diastolic (must be entered as a pair or not at all)
   • Heart Rate (bpm)
   • Oxygen Saturation (%)
   • Respiratory Rate (breaths/min)
4. Enter your name in the student/nurse field
5. Click Save

Not all fields are required — enter only what is clinically available. This supports scenarios where equipment is unavailable or the patient's condition prevents certain measurements.

Blood pressure pairing rule:
Both systolic and diastolic must be entered together, or left blank together. The system will not accept one without the other.`,
      },
      {
        id: 'vital-trends',
        title: 'Viewing Vital Trends',
        content: `After recording at least two sets of vitals, trend charts appear on the Vitals tab.

• Mini-charts show the last 5 readings
• Click any chart to open a detailed trend view
• Trends cover up to the last 20 hours
• Colour indicators flag readings outside normal range

Normal ranges are age-based and applied automatically:
• Neonates (0–28 days): different HR and RR thresholds than adults
• Pediatric: age-banded ranges
• Adult: standard clinical ranges`,
      },
      {
        id: 'vital-alerts',
        title: 'Alert Thresholds',
        content: `hacCare automatically monitors vitals and generates alerts when readings fall outside normal ranges.

Alert types generated from vitals:
• High/low temperature
• Hypertension or hypotension
• Tachycardia or bradycardia
• Low oxygen saturation (SpO2 < 93%)
• Abnormal respiratory rate

Alert priorities:
• Critical (red) — Immediate attention required
• High (orange) — Urgent
• Medium (yellow) — Important but not immediately critical
• Low (blue) — Informational

Alerts appear in the notification bell and in the Alerts panel. Click Acknowledge to mark as reviewed. Alerts remain until acknowledged.`,
      },
    ],
  },
  {
    id: 'medications',
    title: 'Medications & MAR',
    description: 'Medication administration records, BCMA scanning, and medication alerts.',
    icon: Pill,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-700',
    articles: [
      {
        id: 'viewing-mar',
        title: 'The Medication Administration Record (MAR)',
        content: `The MAR lists all active medications for a patient, organized by category:
• Routine — Scheduled recurring medications
• PRN — As-needed medications
• STAT — Immediate/one-time orders
• IV — Intravenous medications and fluids

Each entry shows:
• Medication name, dose, and route
• Scheduled administration times
• Last administration time and who gave it
• Status (Due, Overdue, Upcoming, Administered)

Overdue medications are highlighted in red. Upcoming medications (due within the hour) are shown in amber.`,
      },
      {
        id: 'medication-catalog',
        title: 'The Medication Catalog',
        content: `The Medication Catalog is a master list of drugs with stable barcodes (MZ-series), so a medication's printed label barcode stays the same across simulation resets and relaunches — no reprinting needed every session.

Two tiers:
• Global entries — shared starter pack (MZ001–MZ020), managed by super_admin
• Institution entries — additions scoped to a specific tenant

Accessing it:
Sidebar → Med Catalog (currently visible to super_admin only).

Each catalog entry has:
• Name and generic name
• Formulation (tablet, capsule, IV solution, injection, cream, patch, inhaler, drops, suppository, spray)
• Strength (e.g. "25mg", "10mg/mL")
• Route (oral, intravenous, intramuscular, subcutaneous, topical, inhalation, rectal, sublingual, nasal, transdermal)
• Category (scheduled, PRN, continuous, diabetic, STAT, unscheduled)
• A unique barcode

Managing entries:
1. Click "Add Entry" to create a new catalog medication, or the edit icon on an existing row
2. Fill in the fields above and Save
3. Use the search box to filter the list by name or barcode
4. Select entries with the checkboxes and click "Print Labels" to generate a barcode label sheet for printing

How it's used when prescribing:
When adding or editing a patient's medication (Meds → Add Medication), a catalog search box lets you pick an existing entry instead of typing everything manually — it auto-fills name, strength, route, and formulation, and attaches the catalog's stable barcode. If you skip the catalog and enter a medication manually (free-entry), the system generates a one-off barcode for it instead, which is fine for one-time simulations but won't produce a reusable printed label.`,
      },
      {
        id: 'bcma',
        title: 'Barcode Medication Administration (BCMA)',
        content: `BCMA enforces the Five Rights of medication administration through a dual-scan workflow.

To administer a medication:
1. Click the scan icon on the medication in the MAR
2. Scan or type the patient wristband barcode (P format)
3. Scan or type the medication barcode (MZ format)
4. The system verifies both match the correct patient and prescription
5. Confirm the administration details
6. Enter your name and save

If verification fails:
• Wrong patient barcode — you are scanning a different patient's wristband
• Wrong medication barcode — the medication doesn't match this prescription
• Barcode not found — the medication label may be from a different simulation instance

The Five Rights checked:
1. Right Patient — wristband scan
2. Right Medication — medication barcode
3. Right Dose — confirmed on screen before submission
4. Right Route — shown on the MAR entry
5. Right Time — timestamp recorded on submission`,
      },
      {
        id: 'medication-alerts',
        title: 'Medication Alerts',
        content: `The system generates alerts for medication-related events:

• Medication Due — A scheduled medication is due within the next 30 minutes
• Medication Overdue — A scheduled medication has passed its administration window
• Drug Interaction Warning — Two or more active medications have a known interaction
• Allergy Contraindication — A medication conflicts with a documented allergy
• Missed Dose — A medication window has closed without administration

Alerts are deduplicated — you won't receive the same alert repeatedly for the same medication.

To manage:
Acknowledge alerts via the notification panel. Taking action (administering the medication) will automatically resolve the associated alert.`,
      },
    ],
  },
  {
    id: 'user-roles',
    title: 'User Roles & Permissions',
    description: 'Understanding role-based access and what each role can do.',
    icon: Shield,
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-700',
    articles: [
      {
        id: 'role-overview',
        title: 'Role Overview',
        content: `hacCare uses a hierarchical role system. Each role inherits the permissions of the roles below it.

Role hierarchy (highest → lowest):
1. Super Admin — Cross-tenant access, platform management
2. Coordinator — Tenant-wide management, all simulations/templates visible
3. Admin — User and tenant management within their tenant
4. Instructor — Simulation and template management, filtered by assigned programs
5. Nurse/Student — Patient care documentation within assigned simulations

Role changes require the user to log out and back in to take effect.`,
      },
      {
        id: 'role-permissions',
        title: 'Permissions by Role',
        content: `Student / Nurse:
• Access assigned simulation patients
• Record vitals, medications, assessments
• Use BCMA scanning workflow
• View patient records (read)

Instructor:
• All student permissions
• Create and edit simulation templates
• Launch simulations for their programs
• Assign students to simulations
• View debrief reports
• Only sees simulations/templates tagged with their program(s)

Coordinator:
• All instructor permissions
• See all simulations and templates (no program filter)
• Manage programs and user-to-program assignments
• Access advanced admin features

Admin:
• All coordinator permissions
• User management (create, edit, deactivate)
• Tenant settings

Super Admin:
• All admin permissions across all tenants
• Cross-tenant visibility and switching
• Platform-wide configuration`,
      },
    ],
  },
];
