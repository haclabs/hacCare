# Security Policy

hacCare is a teaching EMR used for clinical simulation. It stores simulated patient records, student
work and staff accounts, so we take reports seriously and appreciate responsible disclosure.

## Reporting a vulnerability

**Please do not open a public issue, pull request or discussion for a security problem.**

Report it privately through GitHub:

1. Go to the repository's **Security** tab → **Report a vulnerability**
   (direct link: <https://github.com/haclabs/hacCare/security/advisories/new>).
2. Describe the issue and how to reproduce it.

Only the maintainer can see the report. You'll be able to discuss it there and, if you like, be
credited in the published advisory.

If you can't use GitHub's private reporting, open a public issue titled **"Security contact
request"** with **no technical details**, and we'll arrange a private channel.

### What to include

- The affected area (page, feature, API/RPC name, or file) and the version or commit if known
- Steps to reproduce, or a minimal proof of concept
- The impact you believe it has (e.g. "a student can read another institution's data")
- Any suggested fix, if you have one

### What to expect

hacCare is maintained by a single developer, so timelines are best-effort:

| Stage | Target |
|---|---|
| Acknowledge your report | within 5 business days |
| Initial assessment and severity | within 14 days |
| Fix or mitigation for critical/high issues | as soon as possible, typically within 30 days |
| Public advisory | after a fix is deployed, coordinated with you |

## Scope

**In scope**

- The hacCare web application and its source code in this repository
- Database access rules (Row Level Security), database functions and migrations in `supabase/`
- Supabase Edge Functions in `supabase/functions/`
- Tenant, institution or role isolation — any way to see or change data you shouldn't
- Authentication, session handling and account management flows

**Out of scope**

- Vulnerabilities in third-party platforms themselves (Supabase, Netlify, GitHub) — please report
  those to the vendor
- Denial-of-service, load or volumetric testing
- Social engineering, phishing or physical attacks
- Reports from automated scanners without a demonstrated, exploitable impact
- Missing security headers or best-practice suggestions with no concrete attack

## Testing guidelines (safe harbor)

We will not pursue action against good-faith research that follows these rules:

- Only test with accounts you own or are authorised to use
- **Do not access, modify or delete data belonging to other users, institutions or students.** If you
  reach someone else's data, stop, and include only the minimum needed to show the issue
- Do not run active or destructive scans against the production site
- Give us reasonable time to fix the issue before any public disclosure

## Supported versions

Only the currently deployed version (the `main` branch) receives security fixes.
