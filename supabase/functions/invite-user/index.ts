// Supabase Edge Function: invite-user
// Creates a new auth user (no password) and emails them a branded "set your
// password" link, generated via Supabase Auth's admin invite/recovery link.
// Requires a valid caller session (admin/coordinator/super_admin only).
// Deploy: supabase functions deploy invite-user
// Secrets required: SMTP2GO_API_KEY (already set), SITE_URL (e.g. https://app.haccare.app)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SMTP2GO_API_KEY = Deno.env.get('SMTP2GO_API_KEY')
const SITE_URL = Deno.env.get('SITE_URL')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

interface InviteRequestBody {
  email: string
  firstName?: string
  lastName?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401)
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Server misconfigured: SUPABASE_SERVICE_ROLE_KEY not set' }, 500)
  }

  if (!SITE_URL) {
    return jsonResponse({ error: 'Server misconfigured: SITE_URL secret not set' }, 500)
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Identify and authorize the caller from their bearer token
  const callerToken = authHeader.replace('Bearer ', '')
  const { data: callerData, error: callerError } = await supabaseAdmin.auth.getUser(callerToken)
  if (callerError || !callerData.user) {
    return jsonResponse({ error: 'Invalid or expired session' }, 401)
  }

  const { data: callerProfile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('role')
    .eq('id', callerData.user.id)
    .single()

  const ALLOWED_INVITER_ROLES = ['admin', 'coordinator', 'super_admin']
  if (profileError || !callerProfile || !ALLOWED_INVITER_ROLES.includes(callerProfile.role)) {
    return jsonResponse({ error: 'Not authorized to invite users' }, 403)
  }

  let body: InviteRequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400)
  }

  const email = body.email?.trim().toLowerCase()
  const firstName = body.firstName?.trim() || ''
  const lastName = body.lastName?.trim() || ''

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email || !emailRegex.test(email)) {
    return jsonResponse({ error: 'A valid email address is required' }, 400)
  }

  const redirectTo = `${SITE_URL.replace(/\/$/, '')}/set-password`

  let linkResult = await supabaseAdmin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      redirectTo,
      data: { first_name: firstName, last_name: lastName },
    },
  })

  // If the user already exists (e.g. resending a welcome email), fall back
  // to a recovery link so they can still set/reset their password.
  if (linkResult.error && /already.*(registered|exists)/i.test(linkResult.error.message)) {
    linkResult = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    })
  }

  if (linkResult.error || !linkResult.data?.properties?.hashed_token || !linkResult.data.user) {
    console.error('generateLink error:', linkResult.error)
    return jsonResponse({ error: 'Failed to create invitation link' }, 500)
  }

  // Link to our own "activate" page with just the token, instead of Supabase's
  // self-consuming verify URL — corporate email scanners (e.g. Microsoft Safe
  // Links) prefetch links in emails, which would silently burn a one-time
  // verify link before the recipient ever clicks it. Our page only calls
  // verifyOtp() on an explicit user click, so scanner prefetches are harmless.
  const hashedToken = linkResult.data.properties.hashed_token
  const verificationType = linkResult.data.properties.verification_type ?? 'invite'
  const actionLink = `${redirectTo}?token_hash=${encodeURIComponent(hashedToken)}&type=${encodeURIComponent(verificationType)}`
  const newUserId = linkResult.data.user.id
  const displayName = firstName ? escapeHtml(firstName) : 'there'

  if (!SMTP2GO_API_KEY) {
    return jsonResponse({ error: 'Server misconfigured: SMTP2GO_API_KEY not set' }, 500)
  }

  const emailRes = await fetch('https://api.smtp2go.com/v3/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: SMTP2GO_API_KEY,
      sender: 'hacCare <noreply@haccare.app>',
      to: [email],
      subject: 'Welcome to hacCare - Set up your account',
      html_body: `
        <h2>Welcome to hacCare, ${displayName}!</h2>
        <p>An administrator has created an account for you. Click the button below to set your password and get started.</p>
        <p style="margin: 24px 0;">
          <a href="${actionLink}" style="background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Set Your Password
          </a>
        </p>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p><a href="${actionLink}">${actionLink}</a></p>
        <p>This link will expire after a limited time. If it expires, ask your administrator to resend the invitation.</p>
      `,
      text_body: `Welcome to hacCare, ${displayName}!\n\nAn administrator has created an account for you. Use the link below to set your password:\n${actionLink}\n\nThis link will expire after a limited time.`,
    }),
  })

  const emailData = await emailRes.json()
  if (!emailRes.ok || emailData.data?.succeeded !== 1) {
    console.error('SMTP2GO send error:', emailData)
    return jsonResponse({ error: 'Invitation created but the welcome email failed to send' }, 502)
  }

  return jsonResponse({ success: true, userId: newUserId }, 200)
})
