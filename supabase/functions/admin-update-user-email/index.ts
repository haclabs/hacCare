// Supabase Edge Function: admin-update-user-email
// Lets an authorized admin change another user's LOGIN email (auth.users),
// not just their user_profiles.email display field. Editing user_profiles
// directly (e.g. via the Table Editor) never touches auth.users — they are
// separate systems, and only the Admin API (service role, used here) or the
// Supabase Dashboard's Auth > Users editor can update the actual credential.
// Requires a valid caller session (admin/coordinator/super_admin only).
// Deploy: supabase functions deploy admin-update-user-email

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

interface UpdateEmailRequestBody {
  userId: string
  newEmail: string
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

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Identify and authorize the caller from their bearer token
  const callerToken = authHeader.replace('Bearer ', '')
  const { data: callerData, error: callerError } = await supabaseAdmin.auth.getUser(callerToken)
  if (callerError || !callerData.user) {
    return jsonResponse({ error: 'Invalid or expired session' }, 401)
  }

  const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
    .from('user_profiles')
    .select('role')
    .eq('id', callerData.user.id)
    .single()

  const ALLOWED_CALLER_ROLES = ['admin', 'coordinator', 'super_admin']
  if (callerProfileError || !callerProfile || !ALLOWED_CALLER_ROLES.includes(callerProfile.role)) {
    return jsonResponse({ error: 'Not authorized to change user emails' }, 403)
  }

  let body: UpdateEmailRequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400)
  }

  const userId = body.userId
  const newEmail = body.newEmail?.trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!userId || !newEmail || !emailRegex.test(newEmail)) {
    return jsonResponse({ error: 'userId and a valid newEmail are required' }, 400)
  }

  // Same role-tier caps as update_user_profile_admin: admins/coordinators
  // can't touch accounts at or above their own tier.
  const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .single()

  if (targetProfileError || !targetProfile) {
    return jsonResponse({ error: 'Target user profile not found' }, 404)
  }

  if (callerProfile.role === 'admin' && ['super_admin', 'coordinator'].includes(targetProfile.role)) {
    return jsonResponse({ error: 'Admins may not change the email of a coordinator or super_admin' }, 403)
  }

  if (callerProfile.role === 'coordinator' && ['super_admin', 'admin'].includes(targetProfile.role)) {
    return jsonResponse({ error: 'Coordinators may not change the email of an admin or super_admin' }, 403)
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email: newEmail,
    email_confirm: true, // set + confirm in one step — no confirmation email sent
  })

  if (updateError) {
    return jsonResponse({ success: false, error: updateError.message }, 200)
  }

  // Keep the app's own display copy in sync with the real credential.
  const { error: profileUpdateError } = await supabaseAdmin
    .from('user_profiles')
    .update({ email: newEmail })
    .eq('id', userId)

  if (profileUpdateError) {
    return jsonResponse({
      success: true,
      warning: 'Login email updated, but syncing user_profiles.email failed: ' + profileUpdateError.message,
    }, 200)
  }

  return jsonResponse({ success: true }, 200)
})
