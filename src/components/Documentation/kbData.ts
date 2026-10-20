/**
 * Knowledge Base Data
 * Article content for the hacCare KB, organized by category. Content uses the small markup
 * described in kbMarkup.ts (## headings, - bullets, 1. steps, > tips, >! warnings, | tables, **bold**).
 */

import { Users, Activity, Shield, PlayCircle, Tag, GraduationCap, Pill, Rocket, ClipboardList } from 'lucide-react';
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
        content: `hacCare is a clinical simulation platform, a teaching EMR. Students use it the way nurses use a real electronic health record: they open a patient chart, review orders, scan a wristband, give medications, chart vitals and document assessments.

Everything happens inside a sealed practice environment that you build and control. hacCare contains no real patient information. Every chart you see is one an instructor built, and each simulation runs in its own separate space.

As an instructor you build the scenario, launch it for a class, watch it run, and afterwards review a report of everything each student did.

## Your role
Your account has a role, and that role decides what appears in your sidebar and which simulations you can open.

- **Instructor**: templates and simulations tagged with the program(s) you're assigned to
- **Coordinator**: everything in your institution, including program setup
- **Admin**: everything in your institution
- **Super Admin**: everything, across all institutions

Programs are the groupings your institution uses, for example NESA, PN, BNAD or SIM Hub. You may be assigned to one or several.

> If a colleague mentions a template you can't find, it's almost always tagged for a program you aren't assigned to. Your coordinator can add you to that program.`,
      },
      {
        id: 'activate-account',
        title: 'Activating Your Account',
        content: `An administrator creates your account. You'll get an email from **hacCare <noreply@haccare.app>** with the subject **"Welcome to hacCare - Set up your account"**. The button inside takes you to a page where you choose your own password.

Nobody at your institution ever sees or sets your password.

## Step 1: Activate
The link opens a page with a single **Activate Account** button. Click it.

> Nothing happens until you click, and that's deliberate. Many school email systems open every link in incoming mail to scan it. A normal one-time link would be used up by the scanner before you ever saw it. The button means only a real click activates your account.

## Step 2: Choose a password
Enter your new password twice. It must have:

- At least 8 characters
- At least one uppercase letter
- At least one symbol, for example ! ? # or $

The rules are listed under the field. Click **Set Password & Continue**. If something's missing you'll see a message and can fix it without retyping everything. When it works you'll see **"Password set! Redirecting you into hacCare..."** and you're taken straight in.

## Troubleshooting
- **Can't find the email**: check your junk or clutter folder. If it isn't there, ask your administrator to resend the invitation.
- **"Invite link invalid or expired"**: links can be used once and expire after a while. Ask your administrator for a fresh invitation. This is normal and doesn't mean anything is broken.`,
      },
      {
        id: 'first-login',
        title: 'Your First Login and Choosing a Program',
        content: `The first time you sign in, one of two things happens:

- **One program**: hacCare opens straight into it.
- **Several programs**: a chooser asks which program to work in. You aren't locked in, and hacCare remembers your choice for next time.

## The top bar
The dark bar across the top shows **Program Workspace**, the program you're in, and its short code. Whenever you're unsure which program's material you're looking at, check here.

If you belong to more than one program, a **Switch Program** button sits next to the program code.

> The bar changes while you work. It shows **Editing Template** while you edit a template and **Active Simulation** when you're inside a running simulation.`,
      },
      {
        id: 'workspace-tour',
        title: 'Touring Your Program Workspace',
        content: `Your program workspace is the home screen you land on each time you sign in.

## The three counters
- **Templates**: simulation templates available to your program
- **Student Logins**: auto-generated simulation logins (see Launching a Simulation)
- **Sessions**: simulations completed this semester

If a number looks wrong, it's usually a program-tagging question rather than missing data.

## Quick links
- **Templates**: create and edit simulation scenarios, and launch them
- **Active Simulations**: start, reset, complete and print labels for running sessions
- **Debrief Reports**: review completed sessions, student by student
- **Student Logins**: auto-generated student logins and passwords, grouped by simulation
- **Knowledge Base**: these articles
- **Instructor Guide**: a walkthrough of the full simulation workflow

The sidebar has the same destinations as **Sim Templates**, **Active Sims**, **Debrief Reports**, **Patient Library**, **Med Catalog** and **Help & Docs**.

> Your workspace has no patients in it, and that's correct. Patients live inside templates and simulations.`,
      },
      {
        id: 'how-simulations-work',
        title: 'How a Simulation Works (The Short Version)',
        content: `## 1. Build a template
A template is a complete practice hospital with your patients in it. You enter the chart once (history, medications, orders, labs, vitals, wounds, devices) and save a snapshot. The snapshot is the frozen starting point.

## 2. Launch it
Launching creates a fresh, private copy of the template for one class session. The original template is untouched, so you can launch the same scenario as often as you like. The clock starts as soon as you launch.

## 3. Students work
Students chart, scan and give medications inside their copy. Their work never touches your template.

## 4. Complete, then reset
- **Complete** ends the session and creates the debrief report.
- **Reset** wipes the students' work and returns the simulation to its starting point (or to a named state, such as "Week 2"). Printed labels keep working.
- **Play** starts the next group's session after a reset.

>! Always **Complete** before you **Reset**. Resetting without completing permanently deletes that group's work.

For the details, see the Simulations category or the **Instructor Guide** tab under Sim Templates.`,
      },
      {
        id: 'where-to-get-help',
        title: 'Where to Get Help',
        content: `**Help & Docs** in the sidebar has:

- **Articles**: short how-to guides. Search looks inside the full text of every article, not just titles.
- **Walkthroughs**: step-by-step guides for common tasks, when your institution has added them.

The **Instructor Guide** tab under Sim Templates covers the simulation workflow end to end. **What's New** in the sidebar lists recent changes.

The welcome tour you saw on your first sign-in can be reopened with **Replay welcome tour** at the top of this page.

Still stuck? Contact your program coordinator. To report a problem or ask for a change, see **Reporting a Problem or Requesting a Feature**.`,
      },
      {
        id: 'report-problem-request-feature',
        title: 'Reporting a Problem or Requesting a Feature',
        content: `Found something that isn't working, or have an idea that would make hacCare better for your class? Send it to us. A clear report gets fixed much faster than "it's broken".

## Where to send it
- **Email**: support@haccare.app
- **Microsoft Teams**: message **colin@haclabs.io**

Use whichever is easier. Teams is quickest for something blocking a class that's running right now.

## Reporting a problem
Include as much of this as you can:

1. **What you were trying to do**: for example "give insulin through BCMA" or "reset the simulation for the afternoon group".
2. **Where it happened**: the template or simulation name, the patient, and the screen (Meds, Orders, Labs, Flowsheets…).
3. **Steps to repeat it**: what you clicked, in order.
4. **What you expected**, and **what actually happened**.
5. **The exact error message**, copied or in a screenshot.
6. **When it happened** (date and time) and **who saw it**: your name and role, or the student login.
7. **How urgent it is**: is a class blocked right now, or can it wait?

> A screenshot of the whole screen is often the single most useful thing, so the top bar shows which template or simulation you were in. On Windows press **Windows + Shift + S**; on a Mac press **Cmd + Shift + 4**.

>! Never send passwords. A student login's email address is fine, but leave its password out.

## Requesting a feature or change
Tell us:

- **The problem it solves**: what's slow, confusing or missing today.
- **What you'd like to happen**: describe it, or sketch it.
- **Who it helps**: instructors, students, a specific program or course.
- **An example from your teaching**: the scenario where you needed it.
- **When you'd need it**: for example "before Week 6 of NESA".

Not sure if it's a bug or a feature request? Send it anyway.

## Example
| What to include | Example |
|---|---|
| **Subject** | Ondansetron label won't scan in BCMA |
| **Where** | Simulation "Room 201 - DKA Faculty Training", patient Robert Hutchins, Meds |
| **Steps** | Scanned the wristband (OK), then scanned the Ondansetron label |
| **Expected** | Medication accepted |
| **Actual** | "Medication barcode does not match expected medication" (screenshot attached) |
| **When / who** | Oct 20, 10:06, a student on Room 201's auto-generated login |
| **Urgency** | Class running now; students are using Override |`,
      },
    ],
  },
  {
    id: 'simulations',
    title: 'Simulations',
    description: 'Building templates, named states, launching, running, and debriefing simulations.',
    icon: PlayCircle,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-700',
    articles: [
      {
        id: 'create-template',
        title: 'Creating and Editing a Template',
        content: `A template is a self-contained practice environment where you build a patient scenario that can be launched again and again.

## Create the template
1. Go to **Sim Templates** and click **Create Template**.
2. Enter a name, optional folder, description and default duration, and choose the program(s) it belongs to.
3. Click Create. The template starts as **Draft**.

## Build the scenario
1. Click **Edit** on the template. hacCare switches you into the template and opens the Patients page.
2. A green **Editing Template** bar appears at the top. Anything you enter while it's showing becomes the template's starting data.
3. Use the normal screens to build the chart:
  - **Add Patient**, or **Add Patient from Library** in the green bar
  - **Meds**: medications, including sliding scales for diabetic medications
  - **Orders**: doctors' orders, including timed orders
  - **Labs**, **Vitals & Assess.**, **HacMap** (wounds and devices), **I&O**, **Notes** and **Flowsheets**

While editing a template, instructors can edit and delete medications and doctors' orders. In a live simulation only coordinators and admins can.

## Save
Click **Save & Exit** in the green bar. hacCare captures a snapshot and returns you home. The template changes from **Draft** to **Ready**, and only Ready templates can be launched.

>! Don't give medications through BCMA while editing a template. The dose is saved as part of the template and copied into every simulation launched from it.

> **Import** at the top of the Templates page and the export button on each template let you move a template between hacCare institutions.`,
      },
      {
        id: 'template-states',
        title: 'Named Template States (Week 1, Week 2, …)',
        content: `A template can hold several saved versions of its data, called **named states**. For example, "Week 1 - Admission" and "Week 2 - Deterioration" can share the same patients with different orders, vitals and labs. You can launch or reset a simulation into any of them, so one set of printed labels lasts the whole course.

## Save a new state
1. Edit the template and change the data for the new week.
2. Click the arrow next to **Save & Exit** and choose **Save as New State…**.
3. Enter a label (for example "Week 2 - Deterioration") and an optional changelog note.

The template's default snapshot is left untouched.

## Edit an existing state
Use **Edit a specific saved state** (the second edit button on the template) and pick the state. The green bar shows **State: Week 2** and the save button reads **Update "Week 2"**.

## Rename or delete a state
Click **Manage named states** on the template.

## Use a state
- **Launch**: pick it under **Launch From** in the launch dialog.
- **Reset**: pick it under **Reset into state** in the reset dialog.

Active simulation cards show a purple badge with the state they were last reset into.`,
      },
      {
        id: 'patient-library',
        title: 'Patient Library: Reusable Patients',
        content: `The Patient Library lets you build a patient once, with a full chart, and add them to any number of simulation templates.

## Create a library patient
1. Open **Patient Library** in the sidebar and click **Create Patient Template**.
2. Fill in demographics: name, date of birth, gender, room/bed, condition, diagnosis, allergies and emergency contact.
3. hacCare creates the patient and opens it with the green **Editing Patient Template** bar.
4. Build the rest of the chart (meds, orders, labs, vitals, assessments, wounds and devices).
5. Click **Save & Exit**. The patient template becomes **Ready**.

## Add a library patient to a simulation template
1. **Edit** the simulation template.
2. Click **Add Patient from Library** in the green bar.
3. Click **Add** next to any Ready patient.
4. Click **Save & Exit** so the new patient is captured in the template's snapshot.

> This is a one-time copy, not a live link. Later changes to the library patient don't update templates that already have a copy, and deleting it doesn't remove those copies.

Instructors see library patients tagged with their program(s). Coordinators and admins see them all.`,
      },
      {
        id: 'launch-simulation',
        title: 'Launching a Simulation',
        content: `Only **Ready** templates can be launched. If the button is greyed out, edit the template and save a snapshot first.

1. In **Sim Templates**, click **Launch** on the template.
2. Choose **Single Simulation**, or **Multiple Rooms** to launch one copy per room (each named "Room 201 - Template name", with its own instructor).
3. Enter a **Simulation Name**, such as a room, section or date.
4. If the template has named states, choose one under **Launch From**.
5. Set the **Duration (minutes)**.
6. Tick the **Primary Category (Program)**, and optionally a **Sub-Category (Type)**.
7. Add people under **Select Participants**, marking each as Instructor or Student, and/or tick **Auto-generate simulation-only student login(s)**.
8. Click Launch.

## Auto-generated student logins
Tick the box and choose how many students (up to 10). Exactly one program must be selected. When the launch finishes, hacCare shows each login's email and password with a **Copy All** button. You can see them again any time with the key icon on the simulation card, or under **Student Logins**. They're deleted only when the simulation is deleted.

## What launch does
- Creates a new, private simulation with the template's data
- Gives every patient a new Patient ID, so print new wristbands for each new simulation
- Keeps every medication's barcode from the template, so medication labels already printed for the template still scan
- Starts the clock immediately. The simulation shows as **running** in Active Sims, and timed doctors' orders start counting down`,
      },
      {
        id: 'manage-simulations',
        title: 'Running, Completing and Resetting',
        content: `Everything for a live session happens on its card in **Active Sims**.

## Card buttons (left to right)
- **Edit category tags**: change program and type tags
- **Print patient and medication labels**
- **Print medication checklist**
- **View auto-generated student logins**
- **Play**: start the simulation (shown when it isn't running)
- **Reset**: clear student work and set the simulation to Ready to Start
- **Complete**: end the session and create the debrief (shown while running)
- **Delete**: permanently remove the simulation and its auto-generated logins

## The session cycle
1. **Launch**: the simulation is running and the clock has started.
2. **Complete**: enter your name. If hacCare finds charting but no Student Name on any of it, it asks you who did the work (or lets you skip). A summary appears and the card shows **Needs Reset**.
3. **Reset**: pick a named state if you want one, then click **Reset Anyway**. Student work is cleared, labels keep working, and the card shows **Ready to Start**.
4. **Play**: the next group begins. The clock and any timed doctors' orders restart from this moment.

>! Reset permanently deletes everything students entered. If you haven't clicked Complete first, that group's work is gone and won't appear in Debrief Reports.

## When time runs out
The card shows **Time expired** and an **Expired** badge. hacCare doesn't end the session for you. It stays open until you click **Complete**.

## Template updated
If someone saves changes to the template after you launched, the card shows **Template Updated**. Click **View Changes & Sync →** to compare. If the patient list is the same, syncing resets the simulation with the new template data (barcodes kept) and sets it to Ready to Start. If patients were added or removed, delete the simulation, launch a new one and print new labels.`,
      },
      {
        id: 'debrief-reports',
        title: 'Debrief Reports',
        content: `Every time you **Complete** a simulation, hacCare creates a debrief report. Find them under **Debrief Reports** in the sidebar.

Click **View Debrief** on a completed session to see:

- Session overview and BCMA compliance
- Each student's activity, grouped by the **Student Name** they entered
- Medications given, with any override reason. Diabetic doses show the glucose reading and the sliding-scale dose, for example "Glucose 13.2 mmol/L → sliding scale: 2 units"
- Vitals, assessments, flowsheets, wounds and devices, notes and other entries
- An instructor notes section, and print/PDF output for your records

You can archive completed sessions into folders, restore one to Active, or delete it permanently.

> Students must enter their name on every form. Work saved without a name can't be attributed, which is why Complete asks you about unnamed entries.`,
      },
      {
        id: 'program-filtering',
        title: 'Program Tags and Who Sees What',
        content: `Templates and simulations are tagged with programs (for example NESA, PN, SIM Hub or BNAD) and, optionally, types.

- Instructors see only templates and simulations tagged with a program they're assigned to.
- Coordinators, admins and super admins see everything in their institution.
- Matching ignores capitals, so "SIM HUB" and "SIM Hub" are the same tag.

## Change tags on an active simulation
1. Click the tag icon (**Edit category tags**) on the simulation card.
2. Choose the **Primary Category (Program)** and **Sub-Category (Type)**.
3. Click **Save Categories**. The change applies immediately without disturbing the session.

## Simulation not showing for an instructor?
- Check it carries the right program tag.
- Check the instructor is assigned to that program. Your coordinator manages program assignments.`,
      },
    ],
  },
  {
    id: 'orders-labs',
    title: 'Orders & Labs',
    description: 'Doctors\' orders, timed orders that appear partway through a simulation, and lab results.',
    icon: ClipboardList,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-700',
    articles: [
      {
        id: 'doctors-orders',
        title: 'Doctors\' Orders',
        content: `Open a patient and click **Orders** in the action bar. A **NEW** badge on Orders means there are orders students haven't acknowledged yet.

## Adding an order (instructors)
1. Click **Add Order**.
2. Enter the date, time (24-hour), **Ordering Doctor** (without "Dr.", it's added automatically) and the **Order** text. Press Enter for new lines.
3. Optionally add notes and a release delay (see Timed Doctors' Orders).
4. Save.

While editing a template, instructors can **Edit** and **Delete** orders. In a live simulation, instructors can add orders but only coordinators and admins can edit or delete them.

## What students do
- **Acknowledge**: confirms they've read the order. They enter their name, and it shows as "Acknowledged by…" and in the debrief.
- **Add Phone/Verbal**: students can record a phone or verbal order they received.`,
      },
      {
        id: 'timed-orders',
        title: 'Timed Doctors\' Orders',
        content: `A timed order stays hidden from students until a set number of minutes into the simulation, then appears on its own. Use it to bring in a new order mid-scenario without leaving your seat: a new medication, a STAT lab, or a change of plan after a deterioration.

## Set up a timed order
1. Edit the template (or open the running simulation) and go to the patient's **Orders**.
2. Add a new order, or **Edit** an existing one in a template.
3. In the purple box, enter **Show to students after (minutes into simulation)**, for example 30.
4. Save.

Leave the box blank or 0 to show the order immediately. The longest delay is 1440 minutes (24 hours).

## When does the countdown start?
- **First group**: at **Launch**. A launched simulation is already running.
- **After a reset**: when you press **Play**. Reset stops the clock, so every group gets the same timing.

## What you see
Students never see a held order. Instructors and admins always do, with a purple badge:

| Where you are | Badge |
|---|---|
| Template | **30 min delay** |
| Running simulation, not yet released | **30 min delay · hidden until 14:30** |
| Running simulation, released | **30 min delay · released 14:30** |

Longer delays show in hours, for example **1 h 30 min delay**.

Once the time passes, the order appears on students' screens within about 30 seconds, without reloading. The **NEW** badge on Orders then prompts them to acknowledge it.

> Timed orders are copied into every simulation launched from the template and are kept through resets and template syncs, so you only set them up once.

>! The delay is counted from the simulation clock, not the time of day. If you launch, wait 20 minutes, then reset and press Play, a 30-minute order appears 30 minutes after Play.`,
      },
      {
        id: 'labs',
        title: 'Lab Results',
        content: `Click **Labs** in the patient action bar. A **NEW** badge means there are results students haven't acknowledged.

## Entering results (instructors)
Instructors, coordinators and admins can enter results, for example to build a template with labs already drawn.

1. Click **New Panel** and fill in the panel details.
2. Open the panel and use **Add Result**, or **+ Add Standard … Test Set** to add a whole set (such as a CBC) in one go.
3. Results outside the reference range are flagged automatically. Critical values show a **CRITICAL** badge.

## What students do
- Review new results and click **Acknowledge** on the panel, entering their name.
- Use **Enter Lab Order** to order a specimen and print its label.`,
      },
    ],
  },
  {
    id: 'medications',
    title: 'Medications & BCMA',
    description: 'The MAR, adding medications, insulin sliding scales, BCMA scanning and dose timing, and the Med Catalog.',
    icon: Pill,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-700',
    articles: [
      {
        id: 'viewing-mar',
        title: 'The Medication Administration Record (MAR)',
        content: `Click **Meds** in the patient action bar. The MAR has three tabs: **Administration**, **History** and **BBIT Chart**.

## Administration
Active medications are grouped into sections. Filter buttons along the top show the count for each:

- **Scheduled**: regular doses at set times
- **PRN (As Needed)**: given when needed, no due times
- **Diabetic**: insulin and other diabetic medications. BCMA asks for a blood glucose and shows the sliding scale.
- **IV/Continuous**: infusions, shown as **RUNNING** when active
- **STAT**: one-time immediate orders

Each medication shows its dose, route, frequency and prescriber. The **BCMA** button turns yellow when a dose is due.

Once a student gives a medication through BCMA, a green **✓ Given 14:32** tag appears next to it. Hover over it to see the full date and time.

## History
**Administration History (24 Hours)** lists every dose given in the last 24 hours, with the dose, route and notes. In simulations and templates only the time is shown (no date), since they're reused for months. The student's name for each dose is in the debrief.

> The Given tag and History are cleared when a simulation is reset, so each group starts with a clean MAR.

## BBIT Chart
The basal-bolus insulin chart: glucose readings, basal and mealtime doses, correction insulin, and hypoglycemia treatment. Use **New Entry** to chart.`,
      },
      {
        id: 'adding-medications',
        title: 'Adding and Editing Medications',
        content: `Instructors add medications while editing a template. Click **Add Medication** on the MAR.

## Pick from the catalog (recommended)
Start typing in **Catalog Lookup** to search the Med Catalog, including brand names. Picking an entry fills in the name, route and category and attaches the catalog's barcode, so printed labels stay the same in every simulation. The **Dosage** field shows the product strength as a reminder. Enter the ordered dose, not the vial strength.

## Free entry
Skip the catalog and type the name. hacCare assigns its own barcode (M + a letter + 5 digits). It's stable once saved, so labels still work after resets and launches. Changing the name of a catalog medication turns it into a free-entry one.

## The rest of the form
- **Category**: Scheduled, PRN, IV/Continuous, STAT or Diabetic. Choosing Diabetic shows the sliding-scale editor.
- **Dosage**, **Route** and **Frequency** (for example "2 times daily" or "Every 4 hours"). Frequency controls the BCMA dose-gap check.
- **Administration Time(s)** in 24-hour format, **Prescribed By** and **Start Date**

## Editing and deleting
**Edit** and **Delete** appear on the MAR for instructors while editing a template, and for coordinators and admins everywhere. **Edit** opens with every field filled in, including route, frequency and category.`,
      },
      {
        id: 'sliding-scale',
        title: 'Insulin Sliding Scale',
        content: `You can attach a sliding (correction) scale to any **Diabetic** medication. When a student scans that medication in BCMA, the scale appears and the row matching their glucose reading is highlighted. The student still decides and enters the dose, so the scale is a guide, not an autopilot.

## Set up a scale
1. Add or **Edit** the medication on the MAR and set **Category** to **Diabetic**.
2. In the orange **Sliding Scale (Optional)** box, click **Add row** for each band.
3. For each row enter **From** and **To** glucose (mmol/L), then choose what happens:
  - **Give units**, then enter the number of units (0.5 steps allowed)
  - **Call MD**
  - **Hold**
4. Save the medication.

Leave **From** or **To** blank for an open-ended row, for example "18.1 or higher → Call MD". Ranges include both ends.

## Example
| Glucose (mmol/L) | Dose |
|---|---|
| 3.9 or lower | Hold |
| 4.0 – 8.0 | 0 units |
| 8.1 – 12.0 | 2 units |
| 12.1 – 18.0 | 4 units |
| 18.1 or higher | Call MD |

## What students see in BCMA
1. They scan the wristband and the medication as usual.
2. They enter the **Blood Glucose** (required for diabetic medications, 1–35 mmol/L).
3. The **Sliding Scale** table appears with a ▶ beside the matching row.
4. They enter the dose they drew up and sign.

If no row covers the reading, BCMA shows "No row covers … mmol/L — check the doctor's orders."

## In the debrief
Each diabetic dose shows the glucose reading and the scale's answer next to what the student actually gave, for example **Glucose 13.2 mmol/L → sliding scale: 4 units**. A mismatch is easy to spot and discuss.

> Scales are copied into every simulation launched from the template and kept on reset. If you change a scale in the template, **View Changes & Sync** on a running simulation brings it across.`,
      },
      {
        id: 'bcma',
        title: 'Barcode Medication Administration (BCMA)',
        content: `BCMA walks the student through the Five Rights with two scans before any dose is recorded.

1. On the MAR, click **BCMA** next to the medication.
2. **Scan Patient Wristband**: scan the QR code on the patient's bracelet.
3. **Scan Medication Barcode**: scan the medication label.
4. **Verify**: hacCare checks the patient, the medication and the timing. A green **5 Rights Verified** bar means everything matched.
5. Complete any extra fields:
  - **Medication Drawn Up / Administered** for IV, IM and SC routes
  - **Blood Glucose** for diabetic medications (the sliding scale appears here)
  - Optional notes
6. Enter the **Student Name** and submit.

If the wristband won't scan, **Enter Manually** lets the student type the Patient ID shown on it (for example P58763) instead.

## When verification fails
- **Patient barcode does not match**: wrong patient's wristband.
- **Medication barcode does not match**: the label belongs to a different medication.
- **Too soon since last dose**, or **Medication due in … minutes**: see BCMA Dose Timing.

The student can click **Override** and enter a reason to continue. Overridden doses show **⚠ Override Applied** with the reason in the debrief, instead of **✓ BCMA Compliant**.

> Students can practise without saving anything using **BCMA Med** in the sidebar (Training). It runs in **PRACTICE MODE**.`,
      },
      {
        id: 'bcma-timing',
        title: 'BCMA Dose Timing',
        content: `BCMA stops a scheduled medication being given again too soon. The minimum gap depends on the medication's **Frequency**:

| Frequency | Scheduled every | BCMA blocks a repeat for |
|---|---|---|
| 1 time daily | 24 h | 20 h |
| 2 times daily | 12 h | 10 h |
| 3 times daily | 8 h | 6 h |
| 4 times daily / Every 6 hours | 6 h | 4 h |
| Every 4 hours | 4 h | 3 h |
| Once monthly | 30 days | 25 days |

Other fixed intervals block for three-quarters of the interval. PRN medications have no timing check.

BCMA also warns if a dose is given more than 30 minutes before it's due.

## In a simulation
Timing only counts doses given in the current session. The first dose after Launch, or after Play following a reset, is never blocked by a previous group's doses.

If a dose really is needed, the student can **Override** with a reason. The override is shown in the debrief.

> This works with any wording the frequency was saved with, including "1 time daily", "Once daily", "BID", "Q4H" or "Every 4 hours".`,
      },
      {
        id: 'medication-catalog',
        title: 'The Med Catalog',
        content: `The **Med Catalog** (in the sidebar) is the master list of medications with permanent barcodes (MZ001, MZ002, …). A catalog medication's label prints the same everywhere, so you can print it once and reuse it in any template or simulation.

Everyone except students can view the catalog and print labels. Only super admins can add and edit entries, because the catalog is shared by every institution. Ask your hacCare administrator if you need a new medication added.

## Each entry has
- **Barcode**: suggested automatically (next MZ number)
- **Name**: the generic name, for example "Insulin Lispro"
- **Brand Name** (optional): for example "Admelog", with no brackets. It prints on its own line under the name: **INSULIN LISPRO** / (Admelog).
- **Strength**: the product strength, for example "100 units/mL" or "25 mg", formatted for you
- **Formulation**, **Route** and **Category**
- **Notes**

> The form warns you (without blocking) when a name or strength is long enough to be cut off on a label. Keep names short and don't repeat the strength in the name.

## Printing catalog labels
Search or tick entries, set a quantity, then use **Print Labels** (Avery 5160) or **Print Small Labels (5167)** for small vials.

Changing a catalog entry doesn't change medications already added to patients. They keep the name and dose they were given.`,
      },
    ],
  },
  {
    id: 'label-printing',
    title: 'Label Printing',
    description: 'Patient wristbands, medication labels, and when you need to reprint.',
    icon: Tag,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
    articles: [
      {
        id: 'label-overview',
        title: 'Understanding Simulation Barcodes',
        content: `hacCare prints QR codes that the BCMA scanner reads.

## Patient wristbands
Each patient has a Patient ID shown on their chart, for example \`P58763\`. The wristband QR code encodes it.

## Medication labels
- **Catalog medications** use the catalog's permanent code, for example \`MZ011\`.
- **Free-entry medications** get their own code, for example \`MA26325\`.

Medication labels aren't patient-specific. BCMA confirms the right patient with the wristband scan.

## When do I need to reprint?
| What happened | Wristbands | Medication labels |
|---|---|---|
| Reset (any state) | Keep | Keep |
| View Changes & Sync | Keep | Keep (print any newly added medications) |
| New launch from the same template | **Reprint**, new Patient IDs | Keep |
| Delete and relaunch | **Reprint** | Keep |
| New medication added to the template | Keep | Print the new one |

> Print labels once per semester for each running simulation and reset it between groups. Wristbands and labels keep working all term.

>! Older templates had a few medications without a stored barcode, so their labels never scanned. That's fixed. If you use **WALKTHROUGH — DKA Faculty Training**, or the **Robert Hutchins** or **Maria Alvarez** patients from the Patient Library, reprint their medication labels.`,
      },
      {
        id: 'print-simulation-labels',
        title: 'Printing Labels for a Simulation',
        content: `Print a simulation's wristbands and medication labels from its card.

1. Go to **Active Sims**.
2. Click the printer icon (**Print patient and medication labels**) on the simulation card.
3. In **Print Labels**:
  - **Patient Bracelets**: set **Qty per patient**, then **Print**
  - **Medication Labels**: one per distinct medication. Set **Qty per medication**, then **Print**
  - **Print All Labels**: one header label plus all bracelets and medication labels on the same sheets
4. Use **Start at row** to reuse a partly used sheet.

## Label stock
Use **Avery 5160** (30 labels per sheet). Choose a high-quality print setting so the QR codes stay sharp, and print one test sheet before a big batch.

## What's on the labels
- **Patient bracelet**: LAST, First name, DOB, Patient ID, attending physician and QR code. Each patient gets their own colour.
- **Medication label**: generic name, brand name on its own line when there is one, dose and form, and QR code.
- **Header label**: simulation name and instructors, to keep sheets organised.

> The **ID Bracelet** button on a patient's Overview shows that patient's bracelet on screen, with the same QR code as the printed wristband. It's handy for checking name, DOB and Patient ID, or for scanning if a wristband goes missing.`,
      },
    ],
  },
  {
    id: 'patient-chart',
    title: 'Patient Chart',
    description: 'Finding patients, the patient action bar, and the Clinical Flowsheets hub.',
    icon: Users,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-700',
    articles: [
      {
        id: 'patient-list',
        title: 'The Patients Page',
        content: `**Patients** in the sidebar lists everyone in the template or simulation you're in, under **My Patients**.

Each card shows the patient's name, age, gender and date of birth, Patient ID, condition, room and bed, and an allergy count when there are allergies. Click a card ("Tap to open full chart") to open the chart.

While editing a template:
- **Add Patient** appears at the top of the page.
- Each card has **Edit Patient Details** and **Remove Patient** buttons.
- In a Patient Library patient, Edit Patient Details is available too.

> Program workspaces have no Patients page. Patients live inside templates and simulations.`,
      },
      {
        id: 'patient-record',
        title: 'The Patient Chart and Action Bar',
        content: `Opening a patient lands on their Overview. The action bar under the patient's name gets you to everything:

- **Chart**: full printable patient record
- **Flowsheets**: the Clinical Flowsheets hub (see next article)
- **Vitals & Assess.**: vital signs, neuro and newborn assessments, and clinical assessment forms
- **Meds**: the MAR and BCMA
- **Labs**: lab results. **NEW** flags unacknowledged results
- **Orders**: doctors' orders. **NEW** flags unacknowledged orders
- **HacMap**: body diagram for devices (IVs, catheters, tubes) and wounds
- **I&O**: intake and output
- **Notes**: handover (SBAR) notes. **NEW** flags unread notes

On the Overview, **ID Bracelet** shows the patient's identification bracelet and **Quick Intro** reopens the student guide.

Each area saves on its own, and everything is attached to the same patient.`,
      },
      {
        id: 'clinical-flowsheets',
        title: 'Clinical Flowsheets Hub',
        content: `Click **Flowsheets** in the action bar to open **Clinical Flowsheets**, the library of assessment and documentation forms. Some cards open a form right there. Others jump to an existing area, such as Vitals, HacMap or I&O.

- **Monitoring & Vitals**: vital signs, neurological, newborn and pain
- **Systems Assessment**: respiratory, cardiovascular, GI, GU, musculoskeletal and integumentary
- **Risk & Safety**: fall risk, pressure injury risk and restraints
- **Wound & Device Care**: device placement and wound assessment (on HacMap)
- **Fluid & Metabolic**: intake and output, blood glucose (BBIT) and bowel assessment
- **Mental Health & Cognition**: biopsychosocial, cognitive screening, and mood and affect
- **Therapeutic Recreation**: the TR workflow (for programs that use it)
- **Clinical Documentation**: handover notes, advanced directives, nursing and admission assessments, consents and BPMH

Use the category bar at the top to jump to a section, and **Patient Overview** to leave.

> Past entries open in a read-only detail view. Instructors can correct a charted nursing assessment, admission assessment or advanced directive. Students always start from a blank form.`,
      },
    ],
  },
  {
    id: 'vital-signs',
    title: 'Vital Signs',
    description: 'Recording vitals, age-based colour coding, and trends.',
    icon: Activity,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-700',
    articles: [
      {
        id: 'recording-vitals',
        title: 'Recording Vital Signs',
        content: `1. Open the patient and click **Vitals & Assess.**
2. On the **Vitals** tab, click **Record Vitals**.
3. Enter what's available:
  - Temperature (°C)
  - Blood pressure: systolic and diastolic, entered together or not at all
  - Heart rate (bpm)
  - Respiratory rate (breaths/min)
  - Oxygen saturation (%), with the oxygen delivery method and flow rate
4. Enter the **Student Name** and save.

Not every measurement is required. At least one is, which suits scenarios where equipment isn't available or the patient (for example a newborn) can't have a blood pressure taken.

> If systolic isn't higher than diastolic, the form flags the reading so the student can check it.

The same screen has tabs for **Neuro Assessment**, **Newborn Assessment** and **Clinical Assessments**.`,
      },
      {
        id: 'reading-vitals',
        title: 'Reading Vitals: Colours and Trends',
        content: `**Latest Vital Signs** shows the most recent reading, colour-coded against normal ranges for the patient's age. The age group (from Newborn to Adult) is shown at the top.

| Colour | Meaning |
|---|---|
| Green | Within the normal range for the patient's age |
| Yellow | Abnormal |
| Red | Critical |
| Grey | Not measured |

Arrows show whether each value is rising, falling or stable compared with the previous reading.

## Trends
Click **View Trends** for charts and a table of the last five readings. **Record Vitals** is right there too.

> Age-based ranges matter: a respiratory rate of 50 is normal for a newborn but critical for an adult.`,
      },
    ],
  },
  {
    id: 'student-guide',
    title: 'Student Guide',
    description: 'Entering a simulation, documenting care, and giving medications with BCMA.',
    icon: GraduationCap,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-700',
    articles: [
      {
        id: 'entering-simulation',
        title: 'Entering a Simulation',
        content: `1. Sign in with the login your instructor gave you.
2. Open **Enter Sim** in the sidebar (simulation-only logins land there automatically).
3. Your simulation appears as a card. Click **Enter Simulation**.
4. Read the reminder and click **Understood — Enter Simulation**.

>! Every form has a **Student Name** field at the bottom. Fill it in before saving, or your work won't appear in your instructor's debrief report.

## Recommended shift workflow
1. Verify patient identity with the **ID Bracelet** button.
2. Review the chart overview.
3. Review **Notes** (handover) from the previous shift.
4. Check **Vitals & Assess.** and record current measurements.
5. Review **Orders** for anything new.
6. Give and document scheduled **Meds**.
7. Check **Labs** for results that need follow-up.
8. Use **Flowsheets** for other assessments or documentation.
9. Write a handover **Note** before you finish.

> New orders can appear partway through a simulation. Keep an eye on the **NEW** badge on Orders.

The **Quick Intro** button reopens the student guide at any time.`,
      },
      {
        id: 'documenting-care',
        title: 'Documenting Patient Care',
        content: `Everything is documented from the patient's chart, using the action bar:

- **Vitals & Assess.**: record vitals (only what's available) and neuro, newborn and clinical assessments
- **Meds**: the MAR. Give medications with BCMA.
- **Orders**: acknowledge new orders, or add a phone/verbal order
- **Labs**: review and acknowledge results, or enter a lab order
- **HacMap**: document devices and wounds on the body diagram
- **I&O**: record intake and output
- **Notes**: write handover (SBAR) notes
- **Flowsheets**: every other assessment and form, from pain and fall risk to admission assessments and BPMH

## Tips
- Enter your **Student Name** on every form.
- A green confirmation appears when something saves.
- Made a mistake? Tell your instructor. They see every entry in the debrief.`,
      },
      {
        id: 'bcma-scanning',
        title: 'Giving Medications with BCMA',
        content: `1. Open **Meds** and click **BCMA** next to the medication.
2. Scan the patient's **wristband**.
3. Scan the **medication label**.
4. Check the verification. A green bar means the Five Rights matched.
5. For IV, IM and SC medications, enter the amount you drew up. Check the doctor's orders and calculate the dose first.
6. For diabetic medications, enter the **blood glucose**. If there's a sliding scale, the matching row is highlighted.
7. Enter your **Student Name** and submit.

## If something goes wrong
- **Patient barcode does not match**: you scanned another patient's wristband.
- **Medication barcode does not match**: that label is for a different medication.
- **Too soon since last dose**: this medication was given recently. Check the MAR's **✓ Given** tag and History.
- **Wristband won't scan**: click **Enter Manually** and type the Patient ID printed on it. If a medication label won't scan, ask your instructor.

**Override** lets you continue with a reason. Your instructor sees every override.

> Want to practise first? **BCMA Med** in the sidebar is a practice sandbox. Nothing you do there is saved.`,
      },
    ],
  },
  {
    id: 'user-roles',
    title: 'User Roles',
    description: 'What each role can see and do.',
    icon: Shield,
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-700',
    articles: [
      {
        id: 'role-overview',
        title: 'Roles at a Glance',
        content: `| Role | Sees | Typical work |
|---|---|---|
| **Student (nurse)** | Simulations they're assigned to | Charting, BCMA, acknowledging orders and labs |
| **Instructor** | Templates and simulations tagged with their program(s) | Building templates, launching and running simulations, debriefs |
| **Admin** | Everything in their institution | As instructors, plus editing medications and orders in live simulations, and adding and editing users in **User & Roles** |
| **Coordinator** | Everything in their institution | Everything an admin can do, plus program setup (**Tenant Mgmt**) and assigning instructors to programs |
| **Super Admin** | Everything, across institutions | Platform administration, including the Med Catalog |

## Good to know
- Instructors can edit and delete medications and doctors' orders while editing a template. In live simulations only coordinators, admins and super admins can.
- Instructors, coordinators and admins can all enter lab panels and results.
- Admins and coordinators can add, edit, deactivate and reactivate users. Admins can't change coordinators or super admins, and coordinators can't change admins or super admins. Only super admins can permanently delete a user.
- Program assignments (which programs an instructor sees) are set by coordinators.
- Everyone except students can open the **Med Catalog** and print its labels. Only super admins can add or edit entries, because the catalog is shared by every institution.
- A role change takes effect the next time the person signs in.`,
      },
    ],
  },
];
