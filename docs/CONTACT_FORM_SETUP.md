# Contact Form Setup Guide

## Overview

The contact form on the landing page can send emails using:
1. **SMTP2GO** (recommended if you have an account) - Simple, reliable SMTP service
2. **Resend** (alternative) - Professional email delivery service
3. **Supabase Database** (fallback) - Stores submissions in the database

## Option 1: Using SMTP2GO (Recommended for existing users)

### Step 1: Get your SMTP2GO API Key
1. Log in to your SMTP2GO account at [smtp2go.com](https://www.smtp2go.com)
2. Go to **Settings** → **API Keys**
3. Click **Create New API Key**
4. Name it "HacCare Contact Form"
5. Make sure it has **Send Email** permission
6. Copy the API key

### Step 2: Add API Key to Supabase
1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add a new secret:
   - Name: `SMTP2GO_API_KEY`
   - Value: Your SMTP2GO API key (starts with `api-`)
4. Click **Save**

### Step 3: Configure Sender Email in SMTP2GO
1. In SMTP2GO, go to **Settings** → **Sender Domains**
2. Verify `haccare.app` domain (if not already done)
3. Add SPF and DKIM records to your DNS
4. Or use a verified sender email like `noreply@yourdomain.com`

### Step 4: Deploy the Edge Function
```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Deploy the function
supabase functions deploy send-contact-email --no-verify-jwt
```

### Step 5: Test the Contact Form
1. Go to https://haccare.app
2. Scroll to the contact form
3. Fill it out and submit
4. Check your `info@haccare.app` inbox
5. You can also check SMTP2GO dashboard for delivery logs

## Option 2: Using Resend (Alternative)

### Step 1: Sign up for Resend
1. Go to [resend.com](https://resend.com)
2. Create a free account (100 emails/day for free)
3. Verify your email address

### Step 2: Add your domain
1. In Resend dashboard, go to **Domains**
2. Add `haccare.app`
3. Add the DNS records Resend provides to your domain registrar:
   - SPF record
   - DKIM record
   - DMARC record (optional but recommended)
4. Wait for verification (can take a few minutes to a few hours)

### Step 3: Create an API Key
1. In Resend dashboard, go to **API Keys**
2. Click **Create API Key**
3. Name it "HacCare Contact Form"
4. Copy the API key (starts with `re_`)

### Step 4: Add API Key to Supabase
1. Go to your Supabase project
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add a new secret:
   - Name: `RESEND_API_KEY`
   - Value: Your Resend API key
4. Click **Save**

### Step 5: Deploy the Edge Function
```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Deploy the function
supabase functions deploy send-contact-email --no-verify-jwt
```

### Step 6: Test the Contact Form
1. Go to https://haccare.app
2. Scroll to the contact form
3. Fill it out and submit
4. Check your info@haccare.app inbox

## Option 3: Database Storage (Fallback)

If you don't want to use an email service, submissions will be stored in the database.

### Step 1: Run the Migration
1. Go to Supabase SQL Editor
2. Open and run `database/migrations/016_create_contact_submissions.sql`

### Step 2: Deploy the Edge Function
```bash
supabase functions deploy send-contact-email --no-verify-jwt
```

### Step 3: View Submissions
Query the database to see submissions:
```sql
SELECT * FROM contact_submissions 
ORDER BY submitted_at DESC;
```

Or create an admin page to view/manage submissions.

## Configuration Notes

### Email "From" Address
The Edge Function sends emails from `noreply@haccare.app`. Make sure:
1. This email is verified in Resend (if using Resend)
2. Or change it to match your verified domain

### CORS Settings
The Edge Function allows all origins (`*`). In production, you might want to restrict to:
```typescript
'Access-Control-Allow-Origin': 'https://haccare.app',
```

### Rate Limiting
Consider adding rate limiting to prevent spam:
- Implement IP-based rate limiting in the Edge Function
- Use Cloudflare rate limiting (if using Cloudflare)
- Add reCAPTCHA or hCaptcha

## Troubleshooting

### SMTP2GO Issues

**"Failed to send message"**
1. Check Supabase Edge Function logs: **Functions** → **send-contact-email** → **Logs**
2. Verify API key is correct and has Send Email permission
3. Check SMTP2GO dashboard → **Activity** → **Email Logs** for delivery status
4. Make sure sender email (`noreply@haccare.app`) is verified in SMTP2GO
5. Check your SMTP2GO account hasn't hit daily/monthly limits

**Email not received**
1. Check spam/junk folder
2. In SMTP2GO dashboard, go to **Activity** → **Email Logs**
3. Look for the sent email and check delivery status
4. Verify `info@haccare.app` is a valid, receiving email address
5. Check if SMTP2GO flagged it as spam (check bounce logs)

**API Key not working**
1. Make sure the API key has **Send Email** permission
2. Check it's added to Supabase as `SMTP2GO_API_KEY` (exact name)
3. Redeploy the Edge Function after adding the secret
4. Test the API key directly:
   ```bash
   curl -X POST https://api.smtp2go.com/v3/email/send \
     -H "Content-Type: application/json" \
     -H "X-Smtp2go-Api-Key: your-api-key" \
     -d '{"sender":"test@yourdomain.com","to":["info@haccare.app"],"subject":"Test","text_body":"Test"}'
   ```

### General Issues

**"Failed to send message"**
1. Check Supabase logs: **Functions** → **send-contact-email** → **Logs**
2. Verify API key is set correctly
3. Check domain verification in Resend
4. Test the Edge Function directly:
   ```bash
   curl -i --location --request POST 'https://<project-ref>.supabase.co/functions/v1/send-contact-email' \
     --header 'Authorization: Bearer <anon-key>' \
     --header 'Content-Type: application/json' \
     --data '{"name":"Test","email":"test@example.com","message":"Test message"}'
   ```

### Email not received
1. Check spam folder
2. Verify domain DNS records in Resend
3. Check Resend logs for delivery status
4. Make sure `info@haccare.app` exists or forward to a real email

### Database table doesn't exist
1. Run the migration: `016_create_contact_submissions.sql`
2. Verify table exists:
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'contact_submissions';
   ```

## Security Considerations

1. **Input Validation**: The Edge Function validates email format and required fields
2. **SQL Injection**: Using Supabase client with parameterized queries
3. **Rate Limiting**: Consider implementing rate limiting
4. **CAPTCHA**: Consider adding reCAPTCHA for production
5. **RLS Policies**: Only super admins can view submissions in database

## Cost Estimates

### SMTP2GO
- Free tier: 1,000 emails/month
- Starter: $10/month for 10,000 emails
- Very reliable and affordable

### Resend
- Free tier: 100 emails/day, 3,000/month
- Paid: $20/month for 50,000 emails

### Supabase Edge Functions
- Free tier: 500,000 invocations/month
- Each form submission = 1 invocation
- Plenty for most use cases

## Email Service Priority

The Edge Function tries services in this order:
1. **SMTP2GO** (if `SMTP2GO_API_KEY` is set) ← Your existing account!
2. **Resend** (if `RESEND_API_KEY` is set)
3. **Database** (if neither API key is set)

You only need ONE email service. Since you have SMTP2GO, just add that API key!

## Alternative Email Services

If you want to switch from SMTP2GO later, you can also use:

### SendGrid
```typescript
const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SENDGRID_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ /* email data */ })
});
```

### AWS SES
```typescript
// Use AWS SDK for JavaScript
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
```

### Postmark
```typescript
const res = await fetch('https://api.postmarkapp.com/email', {
  method: 'POST',
  headers: {
    'X-Postmark-Server-Token': POSTMARK_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ /* email data */ })
});
```

## Next Steps

1. ✅ Deploy the Edge Function
2. ✅ Set up Resend (or alternative)
3. ✅ Test the contact form
4. ⏳ Add rate limiting
5. ⏳ Add CAPTCHA
6. ⏳ Create admin page to view submissions
7. ⏳ Set up email notifications for new submissions
