# SMTP2GO configuration

> **Never paste a real API key into this file.** A live key was committed here
> on 2025-11-20 and sat in a public repository until 2026-09-22. It has been
> revoked. Keep the real value in Supabase secrets only.

All outbound email goes through SMTP2GO, using a single secret,
`SMTP2GO_API_KEY`, read by the Edge Functions at runtime.

## Which functions use it

| Function | Sends |
|---|---|
| `supabase/functions/send-contact-email` | contact-form messages |
| `supabase/functions/invite-user` | account invitations |
| `supabase/functions/create-simulation-student` | simulation student credentials |

`src/services/simulation/autoStudentService.ts` calls the last of these rather
than talking to SMTP2GO directly.

## Setting the key

```bash
# Production (Supabase Cloud)
supabase secrets set SMTP2GO_API_KEY=<your-smtp2go-api-key>

# Confirm it is set -- lists names and digests, never values
supabase secrets list
```

Or in the dashboard: **Project Settings → Edge Functions → Add new secret**,
name `SMTP2GO_API_KEY`.

For local development, put it in `supabase/functions/.env` (gitignored) or
export it before `supabase start`:

```bash
export SMTP2GO_API_KEY=<your-smtp2go-api-key>
supabase start
```

`supabase/config.toml` maps it through:

```toml
[edge_runtime.secrets]
SMTP2GO_API_KEY = "env(SMTP2GO_API_KEY)"
```

## Rotating the key

1. Issue a new key in the SMTP2GO dashboard
2. `supabase secrets set SMTP2GO_API_KEY=<new-key>`
3. Redeploy the three functions above so they pick it up:
   `supabase functions deploy <name>`
4. Revoke the old key in SMTP2GO
5. Send one test email per function before considering it done

## Troubleshooting

| Symptom | Check |
|---|---|
| Email not sending | `supabase secrets list` shows `SMTP2GO_API_KEY`; key not expired or revoked |
| 401 from SMTP2GO | Key was rotated but functions were not redeployed (step 3 above) |
| Works locally, not in production | The local `.env` value is set but the Supabase secret is not |

Function logs: **Dashboard → Edge Functions → Logs**, or
`supabase functions logs <name>`.

## Note on the removed debrief email feature

This file replaces `EMAIL_DEBRIEF_SETUP.md`, which documented deploying a
`send-debrief-report` Edge Function. That function does not exist in
`supabase/functions/`, and nothing in `src/` calls it — the feature was removed
or never shipped, and the document outlived it by months. Debrief reports are
generated and downloaded in-browser; see
`src/features/simulation/components/EnhancedDebriefModal.tsx`.
