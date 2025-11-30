# Email Debrief Report Feature

## Overview
Send debrief reports via email with PDF attachments. Only accessible to instructors, admins, and super_admins.

## Setup

### 1. Configure SMTP2GO API Key

The Edge Function requires the SMTP2GO API key to be set as a secret in Supabase.

#### For Production (Supabase Cloud):

```bash
# Set the secret via Supabase CLI
supabase secrets set SMTP2GO_API_KEY=api-3D1735AEF52540A4B2C5E8337FBDCD7E
```

Or set it via the Supabase Dashboard:
1. Go to Project Settings → Edge Functions
2. Add new secret: `SMTP2GO_API_KEY` with value `api-3D1735AEF52540A4B2C5E8337FBDCD7E`

#### For Local Development:

Create a `.env` file in the `supabase/functions` directory:

```bash
SMTP2GO_API_KEY=api-3D1735AEF52540A4B2C5E8337FBDCD7E
```

Or update `supabase/config.toml`:

```toml
[edge_runtime.secrets]
SMTP2GO_API_KEY = "env(SMTP2GO_API_KEY)"
```

Then set the environment variable before running Supabase:

```bash
export SMTP2GO_API_KEY=api-3D1735AEF52540A4B2C5E8337FBDCD7E
supabase start
```

### 2. Deploy the Edge Function

```bash
# Deploy to production
supabase functions deploy send-debrief-report

# Or test locally
supabase functions serve send-debrief-report
```

## Usage

### From UI:
1. Open a debrief report for a completed simulation
2. Click the **Mail** icon (envelope) in the top-right corner
3. Enter recipient email address(es) - one at a time or press Enter after each
4. Click **Send Report**

### Email Format:

**Subject Line:**
```
[Simulation Name] - YYYY-MM-DD HH:mm MST - Student1, Student2, Student3
```

**Attachment:**
- PDF file with complete student activity report
- Filename: `Student_Activity_Report_[SimulationName]_[Date].pdf`

**Body:**
- Simulation details
- Student count
- Activity summary
- Professional formatting

## Authorization

Only users with the following roles can send emails:
- `instructor`
- `admin`
- `super_admin`

Students and other roles will receive a 403 Forbidden error.

## Architecture

### Components:

1. **EmailDebriefModal.tsx** - UI component for email input
2. **debriefEmailService.ts** - Frontend service layer
3. **send-debrief-report/index.ts** - Supabase Edge Function
4. **pdfGenerator.ts** - PDF generation utility (modified to return base64)

### Data Flow:

```
User clicks Mail icon
  → EmailDebriefModal opens
  → User enters email(s)
  → generateStudentActivityPDFForEmail() creates PDF as base64
  → sendDebriefEmail() calls Edge Function with:
    - historyRecordId
    - recipientEmails[]
    - pdfBase64
    - pdfFilename
  → Edge Function:
    - Validates JWT token
    - Checks user role
    - Fetches simulation_history record
    - Extracts student names from JSONB
    - Converts timestamp to MST
    - Builds subject line
    - Sends via SMTP2GO with PDF attachment
  → Success/error message shown to user
```

## Testing

### Test Authentication:
```bash
# Get a valid JWT token from the browser console:
# localStorage.getItem('sb-[project-ref]-auth-token')

curl -X POST https://[your-project].supabase.co/functions/v1/send-debrief-report \
  -H "Authorization: Bearer [your-jwt-token]" \
  -H "Content-Type: application/json" \
  -d '{
    "historyRecordId": "your-history-record-id",
    "recipientEmails": ["test@example.com"],
    "pdfBase64": "base64-string",
    "pdfFilename": "test.pdf"
  }'
```

### Test with Different Roles:
1. Login as instructor - should work ✅
2. Login as admin - should work ✅
3. Login as student - should fail with 403 ❌

### Test Email Delivery:
1. Check SMTP2GO dashboard for sent emails
2. Verify subject line format
3. Verify PDF attachment opens correctly
4. Verify recipient receives email

## Troubleshooting

### "Failed to send email" Error:
- Check SMTP2GO API key is set correctly
- Verify API key has not expired
- Check SMTP2GO dashboard for quota/limits

### "Unauthorized" Error:
- User not logged in
- JWT token expired - refresh page

### "Forbidden" Error:
- User role is not instructor/admin/super_admin
- Check user's role in profiles table

### PDF Not Attached:
- Check browser console for PDF generation errors
- Verify jsPDF library is loaded
- Check PDF base64 string is not empty

## Future Enhancements

- [ ] Add BCC option for instructors
- [ ] Add custom message field
- [ ] Add option to send individual student reports (filtered)
- [ ] Add email templates with branding
- [ ] Add email delivery confirmation
- [ ] Add retry logic for failed sends
