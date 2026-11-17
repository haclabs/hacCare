import type { MarketingPageContent } from '../types';

export const BCMA_TRAINING: MarketingPageContent = {
  path: '/bcma-training',
  navLabel: 'BCMA training',
  title: 'BCMA Training for Nursing Students | hacCare',
  description:
    'Barcode medication administration practice for Canadian nursing students. Real wristband and medication scans, with every error caught safely.',
  h1: 'Practise BCMA before placement',
  lead:
    'In hacCare, students scan a real patient wristband and a real medication label, and the system checks the order before anything is charted. Wrong patient, wrong dose, wrong time: they find out in the lab, not on the unit.',
  highlights: [
    {
      title: 'Real scanners, real labels',
      body: 'Students scan printed wristbands and medication labels at a simulated bedside, the same motion they will use on shift.',
    },
    {
      title: 'The rights, every time',
      body: 'Each administration is checked for the right patient, medication, dose, route and time before it can be documented.',
    },
    {
      title: 'Errors that teach',
      body: 'When a scan doesn’t match, the student sees why. The instructor sees it too, in the debrief.',
    },
  ],
  image: {
    src: '/images/nurse-scanning.webp',
    alt: 'Student nurse scanning a medication barcode at a simulated patient bedside',
    width: 600,
    height: 450,
    caption: 'A BCMA dual scan in a hacCare simulation lab.',
  },
  screenshot: {
    src: '/images/bcma.webp',
    alt: 'hacCare BCMA screen confirming the five rights before a dose is given',
    width: 1009,
    height: 639,
    caption: 'The BCMA screen: every right confirmed before the dose is given.',
  },
  sections: [
    {
      heading: 'Why BCMA belongs in the curriculum',
      body: [
        'Hospitals use barcode scanning at the bedside to stop medication errors before they reach the patient. Students who have practised the workflow arrive on placement knowing what the scan checks and why a mismatch stops them.',
        'hacCare makes that practice routine: every medication pass in a simulation runs through the same scan-and-verify steps.',
      ],
    },
    {
      heading: 'A working medication administration record',
      body: [
        'Scans happen against a live medication administration record built from the instructor’s orders, and each administration is documented in the patient’s chart, just as it would be on a unit.',
      ],
    },
    {
      heading: 'Echo: BCMA at the bedside',
      body: [
        'Echo by hacCare turns a tablet into a bedside medication station. The student picks the simulation, scans the patient’s wristband and works straight from that patient’s MAR, with no workstation needed in the room.',
      ],
    },
    {
      heading: 'Labels that last the semester',
      body: [
        'Print wristbands and medication labels once and reuse them all semester. Resetting a simulation for the next group keeps the same barcodes.',
      ],
    },
    {
      heading: 'See what every student did',
      body: [
        'After the session, the debrief shows every medication scanned and given, by student, with timestamps: evidence for feedback and competency evaluation.',
      ],
    },
  ],
  ctaHeading: 'See BCMA in hacCare',
  ctaBody: 'We’ll walk your team through a full medication pass, from wristband scan to debrief.',
  related: [
    { path: '/simulation-labs', label: 'For simulation labs' },
    { path: '/educators', label: 'For nursing faculty' },
    { path: '/canadian-nursing-schools', label: 'Built for Canadian schools' },
  ],
};

export const SIMULATION_LABS: MarketingPageContent = {
  path: '/simulation-labs',
  navLabel: 'Simulation labs',
  title: 'EMR for Nursing Simulation Labs | hacCare',
  description:
    'A simulated EMR for nursing simulation centres: live instructor control, bedside barcode scanning, quick resets between groups and per-student debriefs.',
  h1: 'An EMR built for the sim lab',
  lead:
    'Manikins and task trainers make the bedside realistic. hacCare does the same for the chart: students document in a working EMR while instructors run the scenario from their own screen.',
  highlights: [
    {
      title: 'Live instructor control',
      body: 'Follow documentation as it happens and change the scenario in real time: release a result, add an order, trigger an alert.',
    },
    {
      title: 'Reset in one step',
      body: 'Reset a simulation for the next group without rebuilding it. The scenario stays intact; the last group’s charting is cleared.',
    },
    {
      title: 'Every group kept apart',
      body: 'Each running simulation is its own environment, so groups never see each other’s charting.',
    },
  ],
  image: {
    src: '/images/barcode-scanning.webp',
    alt: 'Student nurse scanning a medication label with the patient wristband visible',
    width: 600,
    height: 450,
    caption: 'Bedside scanning during a simulation.',
  },
  screenshot: {
    src: '/images/barcode_med_admin.jpg',
    alt: 'hacCare medication administration record listing PRN and scheduled medications',
    width: 672,
    height: 310,
    caption: 'The medication record students work from during a scenario.',
  },
  sections: [
    {
      heading: 'Built around how a sim day runs',
      body: ['hacCare follows the rhythm of a simulation day instead of asking the lab to work around the software.'],
      bullets: [
        'Build the patient once as a reusable scenario template.',
        'Launch it for a group in seconds and print the barcodes.',
        'Students chart, scan medications and respond to alerts at the bedside.',
        'Reset for the next group.',
        'Review the debrief with your students.',
      ],
    },
    {
      heading: 'Works with the equipment you have',
      body: [
        'hacCare runs in a web browser on lab workstations, laptops and tablets. Echo by hacCare puts the medication record on a bedside tablet with a barcode scanner.',
      ],
    },
    {
      heading: 'Three ways labs use it',
      body: ['The same platform covers the full range of lab work.'],
      bullets: [
        'High-fidelity scenarios, with live barcode scanning at a simulated bedside.',
        'Graded testing scenarios, with every action timestamped and attributed to a student.',
        'Documentation practice outside the lab, on any device, at any time.',
      ],
    },
    {
      heading: 'Debriefs without the paperwork',
      body: [
        'When the scenario ends, hacCare produces a full activity report: every medication scanned, every vital sign recorded, every note written, timestamped and attributed to each student. Export it as a PDF for feedback or records.',
      ],
    },
  ],
  ctaHeading: 'Bring hacCare to your simulation centre',
  ctaBody: 'We’ll show your team a full scenario: build, launch, bedside, reset and debrief.',
  related: [
    { path: '/bcma-training', label: 'BCMA training' },
    { path: '/educators', label: 'For nursing faculty' },
    { path: '/security', label: 'Privacy and security' },
  ],
};

export const EDUCATORS: MarketingPageContent = {
  path: '/educators',
  navLabel: 'Educators',
  title: 'Simulated EMR for Nursing Faculty | hacCare',
  description:
    'Build patient scenarios once, run them every term and see exactly what each student documented. A simulated EMR designed around nursing faculty.',
  h1: 'Scenarios you build once',
  lead:
    'hacCare gives nursing faculty a reusable library of patient scenarios, one-step launches and a clear record of what every student documented.',
  highlights: [
    {
      title: 'Reusable scenarios',
      body: 'Build a patient once, with history, medications, orders, labs and wounds, and run it again next week or next year.',
    },
    {
      title: 'Organised by program',
      body: 'Scenarios are grouped by program, and instructors see the programs they teach.',
    },
    {
      title: 'Evidence for evaluation',
      body: 'Every action is timestamped and attributed to a student, ready for feedback and competency evaluation.',
    },
  ],
  image: {
    src: '/images/nurse-scanning.webp',
    alt: 'Student nurse scanning a medication barcode while an instructor watches the scenario',
    width: 600,
    height: 450,
    caption: 'A scenario running in the simulation lab.',
  },
  screenshot: {
    src: '/images/debrief.webp',
    alt: 'hacCare debrief report showing each student’s documented activity',
    width: 488,
    height: 329,
    caption: 'A debrief report: every action, by student.',
  },
  sections: [
    {
      heading: 'Build a patient once',
      body: [
        'Create a scenario with a full history, medications, orders, labs and wound documentation, and save it as a template. Launching it again takes seconds, so a strong scenario keeps working for you term after term.',
      ],
    },
    {
      heading: 'Teach clinical judgement in the chart',
      body: [
        'Students do more than fill in fields. They acknowledge and action orders, follow up on results flagged as abnormal and respond to alerts, closing the loop the way a real unit expects.',
      ],
    },
    {
      heading: 'Run the scenario live',
      body: [
        'Watch documentation come in as students work, and change the scenario as it unfolds: release a lab result, add an order or trigger an alert at the moment it teaches the most.',
      ],
    },
    {
      heading: 'Debrief with facts',
      body: [
        'After each session you get a report of every medication given, vital sign recorded and note written, by student and by time. Debriefs start from what happened, not from what people remember.',
      ],
    },
    {
      heading: 'Training for your faculty',
      body: [
        'We train your instructors during onboarding, and you work directly with the team in Lethbridge, Alberta that builds hacCare.',
      ],
    },
  ],
  ctaHeading: 'See it from the instructor’s chair',
  ctaBody: 'We’ll build a scenario with you, launch it and walk through the debrief.',
  related: [
    { path: '/simulation-labs', label: 'For simulation labs' },
    { path: '/bcma-training', label: 'BCMA training' },
    { path: '/about', label: 'About hacCare' },
  ],
};
