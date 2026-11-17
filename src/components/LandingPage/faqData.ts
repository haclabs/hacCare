/**
 * Landing page FAQ — single source for both the visible FAQ section and the
 * FAQPage JSON-LD that scripts/prerender.mjs injects into the home page.
 * Google requires FAQ structured data to match content visible on the page,
 * so edit the questions here and nowhere else.
 *
 * Keep answers high-level: this is public marketing copy, not product detail.
 */
export interface FaqItem {
  question: string;
  answer: string;
}

export const LANDING_FAQ: FaqItem[] = [
  {
    question: 'What is hacCare?',
    answer:
      'hacCare is a simulated Electronic Medical Record (EMR) platform built for healthcare education. Nursing students practise real clinical workflows, including barcode medication administration, charting, orders and shift handover, in a safe, instructor-controlled simulation environment.',
  },
  {
    question: 'Who is hacCare for?',
    answer:
      'hacCare is built for Canadian post-secondary nursing and healthcare programs, including practical nursing, bachelor of nursing and simulation centre programs. It is in use at Lethbridge Polytechnic in Alberta.',
  },
  {
    question: 'How does hacCare protect privacy?',
    answer:
      'All patient data in hacCare is fictional; no real patient information is ever stored. Each institution runs in an isolated tenant protected by database Row-Level Security. The platform is designed around PIPEDA privacy principles, with HIPAA-aligned safeguards for institutions working across borders.',
  },
  {
    question: 'What is BCMA training and why does it matter?',
    answer:
      'Barcode Medication Administration (BCMA) is a patient safety process where the nurse scans the patient wristband and the medication before giving a drug, confirming the rights of medication administration. hacCare lets students practise this with real barcode scanning before they reach clinical placements.',
  },
  {
    question: 'How do instructors run simulations?',
    answer:
      'Instructors build reusable patient scenarios, launch them for a student group in one step, follow progress live and review a debrief of each student’s documentation when the session ends.',
  },
  {
    question: 'How do we get access?',
    answer:
      'hacCare is licensed to institutions. Use the request form on this page and we will set up a demo for your program.',
  },
];
