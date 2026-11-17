import type { MarketingPageContent } from '../types';

export const CANADIAN_SCHOOLS: MarketingPageContent = {
  path: '/canadian-nursing-schools',
  navLabel: 'Canadian schools',
  title: 'Academic EHR for Canadian Nursing Schools | hacCare',
  description:
    'An academic EHR built in Canada: data stored in Canada, Canadian clinical standards and one institution licence. Students never buy an access code.',
  eyebrow: 'For Canadian nursing schools',
  h1: 'An academic EHR built in Canada, for Canadian programs',
  lead:
    'Many educational EHRs are designed for the US market. hacCare is built here: data stored in Canada, Canadian clinical standards and a licence that works the way Canadian institutions buy.',
  highlights: [
    {
      title: 'Your data stays in Canada',
      body: 'Student accounts and simulation records are stored in Canada.',
    },
    {
      title: 'Canadian clinical standards',
      body: 'Metric vital signs, Canadian drug references and workflows aligned with Canadian nursing practice.',
    },
    {
      title: 'One licence, no access codes',
      body: 'hacCare is licensed to the institution for the academic year. Students never buy an access code.',
    },
  ],
  sections: [
    {
      heading: 'Data residency, settled',
      body: [
        'hacCare’s database and file storage are hosted in Canada, so student and simulation records stay in the country. Your privacy review doesn’t have to account for student data held abroad.',
      ],
    },
    {
      heading: 'Clinical content that matches Canadian practice',
      body: [
        'Units, ranges and drug references match what students will see on Canadian units, so there is nothing to unlearn on placement.',
      ],
    },
    {
      heading: 'Licensed to the institution',
      body: [
        'One annual institutional licence covers your students for the academic year. No per-student purchases through the bookstore and no codes to chase in the first week of class.',
      ],
    },
    {
      heading: 'Already using an academic EHR?',
      body: [
        'Talk to us about moving your core patient scenarios into hacCare and training your faculty before term starts.',
      ],
    },
    {
      heading: 'Supported from Alberta',
      body: [
        'hacCare is built and supported by haclabs Inc. in Lethbridge, Alberta. You work directly with the team that builds the platform.',
      ],
    },
  ],
  ctaHeading: 'Talk to us about your program',
  ctaBody: 'Tell us how your program teaches documentation today and we’ll show you how hacCare fits.',
  related: [
    { path: '/security', label: 'Privacy and security' },
    { path: '/bcma-training', label: 'BCMA training' },
    { path: '/about', label: 'About hacCare' },
  ],
};

export const SECURITY: MarketingPageContent = {
  path: '/security',
  navLabel: 'Security',
  title: 'Privacy & Security | hacCare',
  description:
    'hacCare stores student and simulation data in Canada, keeps every institution isolated and uses only fictional patients. Designed around PIPEDA.',
  eyebrow: 'Privacy and security',
  h1: 'Privacy and security your institution can sign off on',
  lead:
    'Built for the questions procurement, IT and privacy offices ask before anything reaches students.',
  highlights: [
    {
      title: 'Data stored in Canada',
      body: 'Student accounts and simulation records are stored in Canada.',
    },
    {
      title: 'Fictional patients only',
      body: 'Every patient in hacCare is fictional. No real health information is entered or stored.',
    },
    {
      title: 'Every institution isolated',
      body: 'Each institution’s data is separated at the database level. One school can never see another’s.',
    },
  ],
  sections: [
    {
      heading: 'Canadian data residency',
      body: [
        'hacCare’s database and file storage are hosted in Canada. Student names, accounts and simulation records stay in the country.',
      ],
    },
    {
      heading: 'Designed around PIPEDA',
      body: [
        'hacCare follows the fair information principles of Canada’s federal privacy law, PIPEDA: consent, limited collection and use, safeguards and individual access. It includes HIPAA-aligned safeguards for institutions that work across the border.',
      ],
    },
    {
      heading: 'Access by role',
      body: [
        'Coordinators, administrators, instructors and students each see only what their role allows, and instructors see only the programs they teach. Multi-factor authentication is supported.',
      ],
    },
    {
      heading: 'A complete audit trail',
      body: [
        'Every clinical action, from a medication administration to a vital sign or a note, is timestamped and attributed to a specific user.',
      ],
    },
    {
      heading: 'Security reviews welcome',
      body: [
        'We’ll complete your institution’s security and privacy questionnaire and walk your IT team through the platform. Our privacy notice is public.',
      ],
    },
  ],
  ctaHeading: 'Start your review',
  ctaBody: 'Send us your security questionnaire or book a call with your IT and privacy team.',
  related: [
    { path: '/privacy', label: 'Privacy notice' },
    { path: '/canadian-nursing-schools', label: 'Built for Canadian schools' },
    { path: '/about', label: 'About hacCare' },
  ],
};

export const ABOUT: MarketingPageContent = {
  path: '/about',
  navLabel: 'About',
  title: 'About hacCare | Built in Lethbridge, Alberta',
  description:
    'hacCare is a simulated EMR for nursing and healthcare education, built by haclabs Inc. in Lethbridge, Alberta, and used in Canadian simulation labs.',
  eyebrow: 'About hacCare',
  h1: 'Built in Lethbridge, for Canadian nursing education',
  lead: 'hacCare is made by haclabs Inc., a software and cybersecurity company in Lethbridge, Alberta.',
  highlights: [
    {
      title: 'Canadian-built',
      body: 'Designed for the way Canadian nursing programs teach, with Canadian clinical standards throughout.',
    },
    {
      title: 'In real labs',
      body: 'Students at Lethbridge Polytechnic use hacCare at the bedside, scanning real barcodes on real equipment.',
    },
    {
      title: 'Security by background',
      body: 'Built by a cybersecurity company, so privacy and security are part of the design.',
    },
  ],
  sections: [
    {
      heading: 'What we build',
      body: [
        'hacCare is a simulated electronic medical record for nursing and healthcare education. Students practise real clinical workflows, from barcode medication administration to charting, orders and handover, in a safe, instructor-controlled environment.',
      ],
    },
    {
      heading: 'Where it’s used',
      body: [
        'hacCare runs in the simulation lab at Lethbridge Polytechnic, where students use it at the bedside with instructors watching and running the scenario live.',
      ],
    },
    {
      heading: 'Who we are',
      body: [
        'haclabs Inc. is a full-stack development and cybersecurity company. That background shapes hacCare: student data stays in Canada, every institution is isolated and every patient is fictional.',
      ],
    },
  ],
  ctaHeading: 'Get in touch',
  ctaBody: 'Questions about hacCare or a demo for your program? We’d like to hear from you.',
  related: [
    { path: '/canadian-nursing-schools', label: 'Built for Canadian schools' },
    { path: '/security', label: 'Privacy and security' },
    { path: '/educators', label: 'For nursing faculty' },
  ],
};
